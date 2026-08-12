import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Activity, CommandDef, CreateRequest, EditorApi, FsNode, IdeApi,
  MenuState, OpenFile, PaletteState, Settings, Workspace,
} from './types';
import { ACCENT_PRESETS, Emitter, FONT_PRESETS } from './types';
import {
  isTauri, loadWorkspaceTree, openFolderDialog, readFileText, writeFileText,
  deletePath as fsDeletePath, renamePath as fsRenamePath, vfs,
  createFile as fsCreateFile,
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
import GitPanel from './components/GitPanel';
import BottomPanel from './components/BottomPanel';
import Palette from './components/Palette';
import ContextMenu from './components/ContextMenu';
import Splash from './components/Splash';
import Welcome from './components/Welcome';
import { CONFIG_FILENAME, DEFAULT_CONFIG_TOML, configToSettings } from './config/tomlConfig';
import type { TaskCommands } from './types';

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: 'cyan',
  fontFamily: FONT_PRESETS[0].id,
  fontSize: 14,
  fontLigatures: true,
  lineHeight: 1.5,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'off',
  minimap: true,
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  cursorWidth: 2,
  smoothCaret: true,
  mouseWheelZoom: true,
  autoClosingBrackets: true,
  quickSuggestions: true,
  bracketPairColorization: true,
  indentGuides: true,
  renderLineHighlight: 'all',
  stickyScroll: false,
  paddingY: 14,
  trail: true,
  trailIntensity: 80,
  glow: true,
  glowIntensity: 60,
  particles: true,
  particlesIntensity: 70,
  showHidden: false,
  shell: 'shell',
  terminalFontSize: 13,
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'terminal' | 'tasks'>('terminal');
  const [taskCommands, setTaskCommands] = useState<TaskCommands>({
    build: 'npm run build',
    run: 'npm run dev',
    test: 'npm test',
  });
  const [taskRequest, setTaskRequest] = useState<{
    nonce: number;
    name: string;
    command: string;
  } | null>(null);

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

  // ─── boot ────────────────────────────────────────────────────────────────
  // Запускаемся «чисто»: без виртуального проекта. Пользователь открывает
  // свою папку (десктоп) или пример (браузер/десктоп).
  useEffect(() => {
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

  // ─── apply accent CSS variables ───────────────────────────────────────────
  useEffect(() => {
    const a = ACCENT_PRESETS[settings.accent];
    const root = document.documentElement;
    root.style.setProperty('--accent', a.c1);
    root.style.setProperty('--accent2', a.c2);
    root.style.setProperty('--accent3', a.c3);
  }, [settings.accent]);

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
    // functional update: несколько подряд вызовов (напр. удаление папки)
    // корректно закрывают все вкладки, а не только одну
    setOpenFiles((prev) => prev.filter((f) => f.path !== path));
    if (activePathRef.current === path) {
      const prev = openFilesRef.current;
      const idx = prev.findIndex((f) => f.path === path);
      const next = prev.filter((f) => f.path !== path);
      const neighbor = next[Math.min(idx, next.length - 1)];
      setActivePath(neighbor ? neighbor.path : null);
    }
  }, []);



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


  // ─── конфигурация tinyide.toml ───────────────────────────────────────────
  const configPath = useCallback(
    () => (workspaceRef.current?.rootPath ?? DEMO_ROOT) + '/' + CONFIG_FILENAME,
    []
  );

  const applyConfigText = useCallback(
    (text: string, silent = false) => {
      const res = configToSettings(text);
      if (res.error) {
        if (!silent) toast('Ошибка конфигурации: ' + res.error);
        return;
      }
      if (res.patch) updateSettings(res.patch);
      if (res.commands && Object.keys(res.commands).length > 0) {
        setTaskCommands(res.commands);
      }
      if (!silent) toast('Конфигурация применена ✓');
    },
    [toast, updateSettings]
  );

  const tryApplyConfigAt = useCallback(
    async (mode: 'virtual' | 'real', rootPath: string) => {
      try {
        const text =
          mode === 'virtual'
            ? vfs.readFile(rootPath + '/' + CONFIG_FILENAME)
            : await readFileText({ mode } as Workspace, rootPath + '/' + CONFIG_FILENAME);
        if (text) applyConfigText(text, true);
      } catch {
        /* конфига нет — ок */
      }
    },
    [applyConfigText]
  );

  const openConfigFile = useCallback(async () => {
    const ws = workspaceRef.current;
    if (!ws) {
      toast('Сначала откройте папку или пример проекта');
      return;
    }
    const path = configPath();
    try {
      if (ws.mode === 'virtual') {
        if (!vfs.readFile(path)) vfs.createFile(path, DEFAULT_CONFIG_TOML);
      } else {
        try {
          await fsCreateFile(ws, path);
        } catch {
          /* уже существует */
        }
        try {
          const t = await readFileText(ws, path);
          if (!t.trim()) await writeFileText(ws, path, DEFAULT_CONFIG_TOML);
        } catch {
          /* ignore */
        }
      }
      await refreshTree();
      openFile(path);
      toast('Открыт ' + CONFIG_FILENAME + ' — сохрани (Ctrl+S), чтобы применить');
    } catch (e) {
      toast('Ошибка: ' + String(e));
    }
  }, [configPath, refreshTree, openFile, toast]);

  const reloadConfig = useCallback(async () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const path = configPath();
    try {
      const text =
        path === activePathRef.current && editorApiRef.current
          ? editorApiRef.current.getValue()
          : await readFileText(ws, path);
      applyConfigText(text);
    } catch {
      toast('Конфигурация не найдена — создайте её (Open Config File)');
    }
  }, [configPath, applyConfigText, toast]);

  const requestTask = useCallback((name: string, command: string) => {
    setPanelOpen(true);
    setPanelTab('tasks');
    setTaskRequest({ nonce: Date.now(), name, command });
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
    // если сохранили tinyide.toml — применяем конфигурацию
    if (path === (workspaceRef.current?.rootPath ?? DEMO_ROOT) + '/' + CONFIG_FILENAME) {
      applyConfigText(content);
    }
  }, [toast, applyConfigText]);

  // ─── workspace ops ────────────────────────────────────────────────────────
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
    tryApplyConfigAt('real', dir);
  }, [toast, tryApplyConfigAt]);

  const openExample = useCallback(async () => {
    const tree = await loadWorkspaceTree(DEMO_ROOT, 'virtual', settingsRef.current.showHidden);
    setWorkspace({
      mode: 'virtual',
      rootName: 'example-project',
      rootPath: DEMO_ROOT,
      tree,
    });
    setOpenFiles([]);
    setActivePath(null);
    toast('Пример проекта загружен');
    tryApplyConfigAt('virtual', DEMO_ROOT);
  }, [toast, tryApplyConfigAt]);

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
    { id: 'open-example', label: 'Open Example Project', run: () => openExample() },
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
      id: 'cycle-accent', label: 'Сменить акцентный цвет',
      run: () => {
        const keys = Object.keys(ACCENT_PRESETS) as Settings['accent'][];
        const i = keys.indexOf(settingsRef.current.accent);
        updateSettings({ accent: keys[(i + 1) % keys.length] });
      },
    },
    {
      id: 'cycle-font', label: 'Сменить шрифт редактора',
      run: () => {
        const cur = settingsRef.current.fontFamily;
        const i = FONT_PRESETS.findIndex((f) => f.id === cur);
        updateSettings({ fontFamily: FONT_PRESETS[(i + 1) % FONT_PRESETS.length].id });
      },
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
    { id: 'reset-demo', label: 'Reset Example Project', run: () => openExample() },
    { id: 'toggle-terminal', label: 'Toggle Terminal', key: 'Ctrl+`', run: () => setPanelOpen((v) => !v) },
    { id: 'open-config', label: 'Open Config (tinyide.toml)', run: () => openConfigFile() },
    { id: 'reload-config', label: 'Reload Config', run: () => reloadConfig() },
    ...Object.entries(taskCommands).map(([name, command]) => ({
      id: 'task-' + name,
      label: 'Run task: ' + name,
      run: () => requestTask(name, command),
    })),
    { id: 'about', label: 'About TinyIDE', run: () => toast('TinyIDE v0.4.0 — Tauri 2 · React · Monaco · AGPL-3.0') },
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
      if (mod && e.code === 'Backquote') {
        e.preventDefault();
        setPanelOpen((v) => !v);
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
    resetDemo: openExample,    refreshTree,
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
    panelOpen,
    panelTab,
    setPanelOpen,
    setPanelTab,
    taskCommands,
    taskRequest,
    requestTask,
    openConfigFile,
    reloadConfig,
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
              {activity === 'source' && <GitPanel ide={ide} />}
              {activity === 'languages' && <LanguagesPanel ide={ide} />}
              {activity === 'settings' && <SettingsPanel ide={ide} />}
            </div>
          </div>
        )}
        <div className="main">
          <TabsBar ide={ide} />
          <div className="editor-area">
            <EditorPane ide={ide} />
            {!activePath && <Welcome ide={ide} />}
          </div>
          {panelOpen && <BottomPanel ide={ide} />}
        </div>
      </div>
      <StatusBar ide={ide} />
      {palette && <Palette ide={ide} />}
      {menu && <ContextMenu ide={ide} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
