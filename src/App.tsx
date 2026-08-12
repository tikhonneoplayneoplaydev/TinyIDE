import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Activity, CommandDef, CreateRequest, EditorApi, FsNode, IdeApi,
  MenuState, OpenFile, PaletteState, Settings, Workspace,
} from './types';
import { Emitter } from './types';
import {
  isTauri, loadWorkspaceTree, openFolderDialog, readFileText, writeFileText,
  deletePath as fsDeletePath, renamePath as fsRenamePath, vfs,
} from './fs/bridge';
import { DEMO_ROOT } from './fs/virtual';
import { languageForPath } from './editor/monacoSetup';
import TitleBar from './components/TitleBar';
import ActivityBar from './components/ActivityBar';
import Explorer from './components/Explorer';
import TabsBar from './components/TabsBar';
import EditorPane from './editor/EditorPane';
import StatusBar from './components/StatusBar';
import SearchPanel from './components/SearchPanel';
import LanguagesPanel from './components/LanguagesPanel';
import SettingsPanel from './components/SettingsPanel';
import Palette from './components/Palette';
import ContextMenu from './components/ContextMenu';
import Splash from './components/Splash';
import Welcome from './components/Welcome';

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 4,
  wordWrap: 'off',
  minimap: true,
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  trail: true,
  glow: true,
  particles: true,
  showHidden: false,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('comet.settings');
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [activity, setActivity] = useState<Activity>('explorer');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [palette, setPalette] = useState<PaletteState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [createRequest, setCreateRequest] = useState<CreateRequest>(null);
  const [splash, setSplash] = useState<'show' | 'hide' | 'gone'>('show');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const editorApiRef = useRef<EditorApi | null>(null);
  const savedRef = useRef<Map<string, string>>(new Map());
  const cursorEmitter = useRef(new Emitter<{ line: number; col: number }>());
  const toastTimer = useRef<number | undefined>(undefined);

  // refs mirroring state, for stable event handlers
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const openFilesRef = useRef(openFiles);
  openFilesRef.current = openFiles;
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  // ─── boot: load initial (demo) workspace ──────────────────────────────────
  useEffect(() => {
    loadWorkspaceTree(DEMO_ROOT, 'virtual', settings.showHidden).then((tree) => {
      setWorkspace({
        mode: 'virtual',
        rootName: 'comet-playground',
        rootPath: DEMO_ROOT,
        tree,
      });
    });
    const t1 = window.setTimeout(() => setSplash('hide'), 1500);
    const t2 = window.setTimeout(() => setSplash('gone'), 2100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── settings ─────────────────────────────────────────────────────────────
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem('comet.settings', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // ─── toast ────────────────────────────────────────────────────────────────
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  // ─── file open / close / save ─────────────────────────────────────────────
  const openFile = useCallback((path: string) => {
    setOpenFiles((prev) => {
      if (prev.some((f) => f.path === path)) return prev;
      const name = path.split('/').pop() || path;
      return [...prev, { path, name, language: languageForPath(path) }];
    });
    setActivePath(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    const prev = openFilesRef.current;
    const next = prev.filter((f) => f.path !== path);
    if (activePathRef.current === path) {
      const idx = prev.findIndex((f) => f.path === path);
      const neighbor = next[Math.min(idx, next.length - 1)];
      setActivePath(neighbor ? neighbor.path : null);
    }
    setOpenFiles(next);
  }, []);

  const saveActive = useCallback(async () => {
    const path = activePathRef.current;
    const api = editorApiRef.current;
    const ws = workspaceRef.current;
    if (!path || !api || !ws) return;
    const content = api.getValue();
    await writeFileText(ws, path, content);
    savedRef.current.set(path, content);
    setDirty((d) => ({ ...d, [path]: false }));
    toast('Файл сохранён');
  }, [toast]);

  // ─── workspace ops ────────────────────────────────────────────────────────
  const refreshTree = useCallback(async () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const tree = await loadWorkspaceTree(ws.rootPath, ws.mode, settingsRef.current.showHidden);
    setWorkspace((w) => (w ? { ...w, tree } : w));
  }, []);

  const doFsOp = useCallback(
    async (op: () => Promise<void>, then?: () => void) => {
      try {
        await op();
        then?.();
        await refreshTree();
      } catch (err) {
        console.error(err);
        toast('Ошибка: ' + String(err));
      }
    },
    [refreshTree, toast]
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      await doFsOp(() => fsRenamePath(ws, oldPath, newPath));
      // update open tabs pointing to the old path
      setOpenFiles((prev) =>
        prev.map((f) => {
          if (f.path === oldPath || f.path.startsWith(oldPath + '/')) {
            const p2 = newPath + f.path.slice(oldPath.length);
            return { path: p2, name: p2.split('/').pop() || p2, language: languageForPath(p2) };
          }
          return f;
        })
      );
      if (activePathRef.current === oldPath || activePathRef.current?.startsWith(oldPath + '/')) {
        const p2 = newPath + activePathRef.current.slice(oldPath.length);
        setActivePath(p2);
      }
    },
    [doFsOp]
  );

  const openFolder = useCallback(async () => {
    if (!isTauri) {
      toast('Открытие папок доступно в десктоп-приложении (Tauri)');
      return;
    }
    const dir = await openFolderDialog();
    if (!dir) return;
    const tree = await loadWorkspaceTree(dir, 'real', settingsRef.current.showHidden);
    const name = dir.split('/').pop() || dir;
    setWorkspace({ mode: 'real', rootName: name, rootPath: dir, tree });
    setOpenFiles([]);
    setActivePath(null);
    toast('Открыта папка ' + name);
  }, [toast]);

  const resetDemo = useCallback(() => {
    vfs.reset();
    setOpenFiles([]);
    setActivePath(null);
    setWorkspace({
      mode: 'virtual',
      rootName: 'comet-playground',
      rootPath: DEMO_ROOT,
      tree: vfs.getTree(),
    });
    toast('Демо-проект сброшен');
  }, [toast]);

  const revealLine = useCallback(
    (path: string, line: number) => {
      openFile(path);
      window.setTimeout(() => {
        editorApiRef.current?.reveal(line, 1);
      }, 120);
    },
    [openFile]
  );

  const setDirtyFor = useCallback((path: string, v: boolean) => {
    setDirty((d) => (d[path] === v ? d : { ...d, [path]: v }));
  }, []);

  const registerEditorApi = useCallback((api: EditorApi | null) => {
    editorApiRef.current = api;
  }, []);

  const requestCreate = useCallback((parentPath: string, kind: 'file' | 'dir') => {
    setCreateRequest({ parentPath, kind });
  }, []);

  const clearCreateRequest = useCallback(() => setCreateRequest(null), []);

  const treeFiles = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return [];
    const out: { path: string; name: string }[] = [];
    const walk = (n: FsNode) => {
      if (n.kind === 'file') out.push({ path: n.path, name: n.name });
      else n.children?.forEach(walk);
    };
    walk(ws.tree);
    return out;
  }, []);

  // ─── commands (command palette) ───────────────────────────────────────────
  const commands: CommandDef[] = [
    { id: 'open-folder', label: 'Open Folder…', run: () => openFolder() },
    { id: 'open-file', label: 'Open File…', key: 'Ctrl+P', run: () => setPalette({ mode: 'quick' }) },
    {
      id: 'new-file', label: 'New File',
      run: () => {
        setActivity('explorer');
        setSidebarOpen(true);
        requestCreate(workspaceRef.current?.rootPath ?? DEMO_ROOT, 'file');
      },
    },
    {
      id: 'new-folder', label: 'New Folder',
      run: () => {
        setActivity('explorer');
        setSidebarOpen(true);
        requestCreate(workspaceRef.current?.rootPath ?? DEMO_ROOT, 'dir');
      },
    },
    { id: 'save', label: 'Save', key: 'Ctrl+S', run: () => saveActive() },
    { id: 'format', label: 'Format Document', run: () => editorApiRef.current?.format() },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', key: 'Ctrl+B', run: () => setSidebarOpen((v) => !v) },
    {
      id: 'toggle-wordwrap', label: 'Toggle Word Wrap',
      run: () => updateSettings({ wordWrap: settingsRef.current.wordWrap === 'on' ? 'off' : 'on' }),
    },
    {
      id: 'toggle-minimap', label: 'Toggle Minimap',
      run: () => updateSettings({ minimap: !settingsRef.current.minimap }),
    },
    {
      id: 'toggle-trail', label: 'Comet Trail: вкл/выкл',
      run: () => updateSettings({ trail: !settingsRef.current.trail }),
    },
    {
      id: 'toggle-glow', label: 'Cursor Glow: вкл/выкл',
      run: () => updateSettings({ glow: !settingsRef.current.glow }),
    },
    {
      id: 'toggle-particles', label: 'Искры при наборе: вкл/выкл',
      run: () => updateSettings({ particles: !settingsRef.current.particles }),
    },
    {
      id: 'theme', label: 'Toggle Theme',
      run: () => updateSettings({ theme: settingsRef.current.theme === 'dark' ? 'light' : 'dark' }),
    },
    {
      id: 'open-settings', label: 'Settings',
      run: () => {
        setActivity('settings');
        setSidebarOpen(true);
      },
    },
    { id: 'reset-demo', label: 'Reset Demo Project', run: () => resetDemo() },
    { id: 'about', label: 'About Comet IDE', run: () => toast('Comet IDE v0.1.0 — Tauri 2 · React · Monaco') },
  ];

  // ─── global keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === 'F1') {
        e.preventDefault();
        setPalette({ mode: 'command' });
        return;
      }
      if (mod && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        setPalette({ mode: 'command' });
        return;
      }
      if (mod && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        setActivity('search');
        setSidebarOpen(true);
        return;
      }
      if (mod && e.code === 'KeyP') {
        e.preventDefault();
        setPalette({ mode: 'quick' });
        return;
      }
      if (mod && e.code === 'KeyS') {
        e.preventDefault();
        saveActive();
        return;
      }
      if (mod && e.code === 'KeyB') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
        return;
      }
      if (mod && e.code === 'KeyW') {
        e.preventDefault();
        const p = activePathRef.current;
        if (p) closeTab(p);
        return;
      }
      if (mod && e.code === 'Equal') {
        e.preventDefault();
        updateSettings({ fontSize: Math.min(28, settingsRef.current.fontSize + 1) });
        return;
      }
      if (mod && e.code === 'Minus') {
        e.preventDefault();
        updateSettings({ fontSize: Math.max(9, settingsRef.current.fontSize - 1) });
        return;
      }
      if (e.key === 'Escape') {
        setPalette(null);
        setMenu(null);
        setCreateRequest(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeTab, saveActive, updateSettings]);

  const ide: IdeApi = {
    settings,
    updateSettings,
    workspace,
    openFiles,
    activePath,
    dirty,
    activity,
    sidebarOpen,
    palette,
    menu,
    createRequest,
    savedRef,
    cursorEmitter: cursorEmitter.current,
    openFile,
    setActivePath,
    closeTab,
    saveActive,
    openFolder,
    resetDemo,
    refreshTree,
    doFsOp,
    renameFile,
    revealLine,
    requestCreate,
    clearCreateRequest,
    setActivity,
    setSidebarOpen,
    setPalette,
    setMenu,
    toast,
    setDirtyFor,
    registerEditorApi,
    commands,
    treeFiles,
  };

  return (
    <div className="app" data-theme={settings.theme}>
      {splash !== 'gone' && <Splash hidden={splash === 'hide'} />}
      <TitleBar activeFile={activePath ? (openFiles.find((f) => f.path === activePath)?.name ?? null) : null} />
      <div className="app-body">
        {sidebarOpen && (
          <div className="sidebar">
            <ActivityBar ide={ide} />
            <div className="sidebar-panel">
              {activity === 'explorer' && <Explorer ide={ide} />}
              {activity === 'search' && <SearchPanel ide={ide} />}
              {activity === 'languages' && <LanguagesPanel ide={ide} />}
              {activity === 'settings' && <SettingsPanel ide={ide} />}
            </div>
          </div>
        )}
        <div className="main">
          <TabsBar ide={ide} />
          <div className="editor-area">
            <EditorPane ide={ide} />
            {!activePath && workspace && <Welcome ide={ide} />}
          </div>
        </div>
      </div>
      <StatusBar ide={ide} />
      {palette && <Palette ide={ide} />}
      {menu && <ContextMenu ide={ide} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
