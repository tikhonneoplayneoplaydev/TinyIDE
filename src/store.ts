// ─── Глобальный реактивный стор TinyIDE (Vue 3) ───────────────────────────
import { reactive, computed } from 'vue';
import type {
  Activity, CommandDef, CreateRequest, CursorInfo, EditorApi, FsNode,
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
  customShells: [],
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('tinyide.settings');
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ─── нереактивные внутренности ────────────────────────────────────────────
const savedMap = new Map<string, string>();
export const cursorEmitter = new Emitter<CursorInfo>();
let editorApi: EditorApi | null = null;
let monacoEditor: monaco_editor | null = null;
let toastTimer: number | undefined;

// лёгкий тип-алиас, чтобы не тащить monaco в store
type monaco_editor = import('monaco-editor/esm/vs/editor/editor.api').editor.IStandaloneCodeEditor;
export function setMonacoEditor(e: monaco_editor | null) {
  monacoEditor = e;
}
export function getMonacoEditor(): monaco_editor | null {
  return monacoEditor;
}

// ─── стор ─────────────────────────────────────────────────────────────────
export const store = reactive({
  settings: loadSettings(),
  workspace: null as Workspace | null,
  openFiles: [] as OpenFile[],
  activePath: null as string | null,
  dirty: {} as Record<string, boolean>,
  activity: 'explorer' as Activity,
  sidebarOpen: true,
  palette: null as PaletteState | null,
  menu: null as MenuState | null,
  createRequest: null as CreateRequest,
  panelOpen: false,
  panelTab: 'terminal' as 'terminal' | 'tasks',
  taskCommands: {
    build: 'npm run build',
    run: 'npm run dev',
    test: 'npm test',
  } as TaskCommands,
  taskRequest: null as { nonce: number; name: string; command: string } | null,
  toastMsg: null as string | null,
  splash: 'show' as 'show' | 'hide' | 'gone',

  // ── actions ──────────────────────────────────────────────────────────────
  updateSettings(patch: Partial<Settings>) {
    Object.assign(this.settings, patch);
    try {
      localStorage.setItem('tinyide.settings', JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
  },

  toast(msg: string) {
    this.toastMsg = msg;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (this.toastMsg = null), 2600);
  },

  openFile(path: string) {
    if (!this.openFiles.some((f) => f.path === path)) {
      const name = path.split('/').pop() || path;
      this.openFiles.push({ path, name, language: languageForPath(path) });
    }
    this.activePath = path;
  },

  setActivePath(path: string | null) {
    this.activePath = path;
  },

  closeTab(path: string) {
    const prev = this.openFiles;
    this.openFiles = prev.filter((f) => f.path !== path);
    if (this.activePath === path) {
      const idx = prev.findIndex((f) => f.path === path);
      const next = this.openFiles;
      const neighbor = next[Math.min(idx, next.length - 1)];
      this.activePath = neighbor ? neighbor.path : null;
    }
  },

  async saveActive() {
    const path = this.activePath;
    const ws = this.workspace;
    if (!path || !editorApi || !ws) return;
    const content = editorApi.getValue();
    await writeFileText(ws, path, content);
    savedMap.set(path, content);
    this.dirty = { ...this.dirty, [path]: false };
    this.toast('Файл сохранён');
    if (path === (this.workspace?.rootPath ?? DEMO_ROOT) + '/' + CONFIG_FILENAME) {
      applyConfigText(content);
    }
  },

  async refreshTree() {
    const ws = this.workspace;
    if (!ws) return;
    const tree = await loadWorkspaceTree(ws.rootPath, ws.mode, this.settings.showHidden);
    this.workspace = { ...ws, tree };
  },

  async doFsOp(op: () => Promise<void>, then?: () => void) {
    try {
      await op();
      then?.();
      await this.refreshTree();
    } catch (err) {
      console.error(err);
      this.toast('Ошибка: ' + String(err));
    }
  },

  async renameFile(oldPath: string, newPath: string) {
    const ws = this.workspace;
    if (!ws) return;
    await this.doFsOp(() => fsRenamePath(ws, oldPath, newPath));
    this.openFiles = this.openFiles.map((f) => {
      if (f.path === oldPath || f.path.startsWith(oldPath + '/')) {
        const p2 = newPath + f.path.slice(oldPath.length);
        return { path: p2, name: p2.split('/').pop() || p2, language: languageForPath(p2) };
      }
      return f;
    });
    if (this.activePath === oldPath || this.activePath?.startsWith(oldPath + '/')) {
      this.activePath = newPath + (this.activePath ?? '').slice(oldPath.length);
    }
  },

  async setWorkspacePath(path: string, toastMsg?: string) {
    const tree = await loadWorkspaceTree(path, 'real', this.settings.showHidden);
    const name = path.split('/').pop() || path;
    this.workspace = { mode: 'real', rootName: name, rootPath: path, tree };
    this.openFiles = [];
    this.activePath = null;
    if (toastMsg) this.toast(toastMsg);
    tryApplyConfigAt('real', path);
  },

  async openFolder() {
    if (!isTauri) {
      this.toast('Открытие папок доступно в десктоп-приложении (Tauri)');
      return;
    }
    const dir = await openFolderDialog();
    if (!dir) return;
    const tree = await loadWorkspaceTree(dir, 'real', this.settings.showHidden);
    const name = dir.split('/').pop() || dir;
    this.workspace = { mode: 'real', rootName: name, rootPath: dir, tree };
    this.openFiles = [];
    this.activePath = null;
    this.toast('Открыта папка ' + name);
    tryApplyConfigAt('real', dir);
  },

  async openExample() {
    const tree = await loadWorkspaceTree(DEMO_ROOT, 'virtual', this.settings.showHidden);
    this.workspace = { mode: 'virtual', rootName: 'example-project', rootPath: DEMO_ROOT, tree };
    this.openFiles = [];
    this.activePath = null;
    this.toast('Пример проекта загружен');
    tryApplyConfigAt('virtual', DEMO_ROOT);
  },

  revealLine(path: string, line: number) {
    this.openFile(path);
    window.setTimeout(() => editorApi?.reveal(line, 1), 120);
  },

  requestCreate(parentPath: string, kind: 'file' | 'dir') {
    this.createRequest = { parentPath, kind };
  },

  clearCreateRequest() {
    this.createRequest = null;
  },

  setDirtyFor(path: string, v: boolean) {
    if (this.dirty[path] !== v) this.dirty = { ...this.dirty, [path]: v };
  },

  registerEditorApi(api: EditorApi | null) {
    editorApi = api;
  },

  setActivity(a: Activity) {
    this.activity = a;
  },

  setSidebarOpen(v: boolean) {
    this.sidebarOpen = v;
  },

  setPalette(p: PaletteState | null) {
    this.palette = p;
  },

  setMenu(m: MenuState | null) {
    this.menu = m;
  },

  setPanelOpen(v: boolean) {
    this.panelOpen = v;
  },

  setPanelTab(t: 'terminal' | 'tasks') {
    this.panelTab = t;
  },

  requestTask(name: string, command: string) {
    this.panelOpen = true;
    this.panelTab = 'tasks';
    this.taskRequest = { nonce: Date.now(), name, command };
  },

  // конфиг tinyide.toml
  async openConfigFile() {
    const ws = this.workspace;
    if (!ws) {
      this.toast('Сначала откройте папку или пример проекта');
      return;
    }
    const path = (ws.rootPath ?? DEMO_ROOT) + '/' + CONFIG_FILENAME;
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
      await this.refreshTree();
      this.openFile(path);
      this.toast('Открыт ' + CONFIG_FILENAME + ' — сохрани (Ctrl+S), чтобы применить');
    } catch (e) {
      this.toast('Ошибка: ' + String(e));
    }
  },

  async reloadConfig() {
    const ws = this.workspace;
    if (!ws) return;
    const path = (ws.rootPath ?? DEMO_ROOT) + '/' + CONFIG_FILENAME;
    try {
      const text =
        path === this.activePath && editorApi
          ? editorApi.getValue()
          : await readFileText(ws, path);
      applyConfigText(text);
    } catch {
      this.toast('Конфигурация не найдена — создайте её (Open Config File)');
    }
  },

  treeFiles(): { path: string; name: string }[] {
    const ws = this.workspace;
    if (!ws) return [];
    const out: { path: string; name: string }[] = [];
    const walk = (n: FsNode) => {
      if (n.kind === 'file') out.push({ path: n.path, name: n.name });
      else n.children?.forEach(walk);
    };
    walk(ws.tree);
    return out;
  },

  // editor bridge для CursorFX и терминала
  get editorApi(): EditorApi | null {
    return editorApi;
  },
});

// ─── команды палитры (computed, зависит от задач) ─────────────────────────
export const commands = computed<CommandDef[]>(() => {
  const s = store;
  return [
    { id: 'open-folder', label: 'Open Folder…', run: () => s.openFolder() },
    { id: 'open-example', label: 'Open Example Project', run: () => s.openExample() },
    { id: 'open-file', label: 'Open File…', key: 'Ctrl+P', run: () => s.setPalette({ mode: 'quick' }) },
    {
      id: 'new-file', label: 'New File',
      run: () => {
        s.setActivity('explorer');
        s.setSidebarOpen(true);
        s.requestCreate(s.workspace?.rootPath ?? DEMO_ROOT, 'file');
      },
    },
    {
      id: 'new-folder', label: 'New Folder',
      run: () => {
        s.setActivity('explorer');
        s.setSidebarOpen(true);
        s.requestCreate(s.workspace?.rootPath ?? DEMO_ROOT, 'dir');
      },
    },
    { id: 'save', label: 'Save', key: 'Ctrl+S', run: () => s.saveActive() },
    { id: 'format', label: 'Format Document', run: () => editorApi?.format() },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', key: 'Ctrl+B', run: () => s.setSidebarOpen(!s.sidebarOpen) },
    { id: 'toggle-terminal', label: 'Toggle Terminal', key: 'Ctrl+`', run: () => s.setPanelOpen(!s.panelOpen) },
    {
      id: 'toggle-wordwrap', label: 'Toggle Word Wrap',
      run: () => s.updateSettings({ wordWrap: s.settings.wordWrap === 'on' ? 'off' : 'on' }),
    },
    {
      id: 'toggle-minimap', label: 'Toggle Minimap',
      run: () => s.updateSettings({ minimap: !s.settings.minimap }),
    },
    {
      id: 'toggle-trail', label: 'Comet Trail: вкл/выкл',
      run: () => s.updateSettings({ trail: !s.settings.trail }),
    },
    {
      id: 'toggle-glow', label: 'Cursor Glow: вкл/выкл',
      run: () => s.updateSettings({ glow: !s.settings.glow }),
    },
    {
      id: 'toggle-particles', label: 'Искры при наборе: вкл/выкл',
      run: () => s.updateSettings({ particles: !s.settings.particles }),
    },
    {
      id: 'cycle-accent', label: 'Сменить акцентный цвет',
      run: () => {
        const keys = Object.keys(ACCENT_PRESETS) as Settings['accent'][];
        const i = keys.indexOf(s.settings.accent);
        s.updateSettings({ accent: keys[(i + 1) % keys.length] });
      },
    },
    {
      id: 'cycle-font', label: 'Сменить шрифт редактора',
      run: () => {
        const cur = s.settings.fontFamily;
        const i = FONT_PRESETS.findIndex((f) => f.id === cur);
        s.updateSettings({ fontFamily: FONT_PRESETS[(i + 1) % FONT_PRESETS.length].id });
      },
    },
    { id: 'open-config', label: 'Open Config (tinyide.toml)', run: () => s.openConfigFile() },
    { id: 'reload-config', label: 'Reload Config', run: () => s.reloadConfig() },
    ...Object.entries(s.taskCommands).map(([name, command]) => ({
      id: 'task-' + name,
      label: 'Run task: ' + name,
      run: () => s.requestTask(name, command),
    })),
    {
      id: 'open-settings', label: 'Settings',
      run: () => {
        s.setActivity('settings');
        s.setSidebarOpen(true);
      },
    },
    { id: 'reset-demo', label: 'Reset Example Project', run: () => s.openExample() },
    { id: 'about', label: 'About TinyIDE', run: () => s.toast('TinyIDE v0.5.0 — Tauri 2 · Vue 3 · Monaco · AGPL-3.0') },
  ];
});

// ─── конфигурация tinyide.toml ────────────────────────────────────────────
function applyConfigText(text: string, silent = false) {
  const res = configToSettings(text);
  if (res.error) {
    if (!silent) store.toast('Ошибка конфигурации: ' + res.error);
    return;
  }
  if (res.patch) store.updateSettings(res.patch);
  if (res.commands && Object.keys(res.commands).length > 0) {
    store.taskCommands = res.commands;
  }
  if (!silent) store.toast('Конфигурация применена ✓');
}

async function tryApplyConfigAt(mode: 'virtual' | 'real', rootPath: string) {
  try {
    const text =
      mode === 'virtual'
        ? vfs.readFile(rootPath + '/' + CONFIG_FILENAME)
        : await readFileText({ mode } as Workspace, rootPath + '/' + CONFIG_FILENAME);
    if (text) applyConfigText(text, true);
  } catch {
    /* конфига нет — ок */
  }
}

// ─── акцент → CSS-переменные ──────────────────────────────────────────────
export function applyAccentCSS(accent: Settings['accent']) {
  const a = ACCENT_PRESETS[accent];
  const root = document.documentElement;
  root.style.setProperty('--accent', a.c1);
  root.style.setProperty('--accent2', a.c2);
  root.style.setProperty('--accent3', a.c3);
}

// ─── горячие клавиши ──────────────────────────────────────────────────────
export function initHotkeys() {
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.code === 'F1') {
      e.preventDefault();
      store.setPalette({ mode: 'command' });
      return;
    }
    if (mod && e.shiftKey && e.code === 'KeyP') {
      e.preventDefault();
      store.setPalette({ mode: 'command' });
      return;
    }
    if (mod && e.shiftKey && e.code === 'KeyF') {
      e.preventDefault();
      store.setActivity('search');
      store.setSidebarOpen(true);
      return;
    }
    if (mod && e.code === 'KeyP') {
      e.preventDefault();
      store.setPalette({ mode: 'quick' });
      return;
    }
    if (mod && e.code === 'KeyS') {
      e.preventDefault();
      store.saveActive();
      return;
    }
    if (mod && e.code === 'KeyB') {
      e.preventDefault();
      store.setSidebarOpen(!store.sidebarOpen);
      return;
    }
    if (mod && e.code === 'Backquote') {
      e.preventDefault();
      store.setPanelOpen(!store.panelOpen);
      return;
    }
    if (mod && e.code === 'KeyW') {
      e.preventDefault();
      const p = store.activePath;
      if (p) store.closeTab(p);
      return;
    }
    if (mod && e.code === 'Equal') {
      e.preventDefault();
      store.updateSettings({ fontSize: Math.min(28, store.settings.fontSize + 1) });
      return;
    }
    if (mod && e.code === 'Minus') {
      e.preventDefault();
      store.updateSettings({ fontSize: Math.max(9, store.settings.fontSize - 1) });
      return;
    }
    if (e.key === 'Escape') {
      store.setPalette(null);
      store.setMenu(null);
      store.createRequest = null;
    }
  });
}

// ─── splash-таймеры (вызывается из App.vue) ───────────────────────────────
export function startSplashTimer() {
  window.setTimeout(() => (store.splash = 'hide'), 1500);
  window.setTimeout(() => (store.splash = 'gone'), 2100);
}

export { savedMap };
