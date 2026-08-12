// ─── Shared types for Comet IDE ─────────────────────────────────────────────

import type { MutableRefObject } from 'react';

export type FsNode = {
  name: string;
  path: string;
  kind: 'file' | 'dir';
  size?: number;
  /** virtual-mode only */
  content?: string;
  children?: FsNode[];
};

export type Workspace = {
  mode: 'virtual' | 'real';
  rootName: string;
  rootPath: string;
  tree: FsNode;
};

export type OpenFile = {
  path: string;
  name: string;
  language: string;
};

export type AccentKey = 'cyan' | 'violet' | 'pink' | 'green' | 'amber' | 'red';

export const ACCENT_PRESETS: Record<
  AccentKey,
  { label: string; c1: string; c2: string; c3: string }
> = {
  cyan: { label: 'Бирюза', c1: '#22d3ee', c2: '#a78bfa', c3: '#f472b6' },
  violet: { label: 'Фиолет', c1: '#a78bfa', c2: '#f472b6', c3: '#22d3ee' },
  pink: { label: 'Розовый', c1: '#f472b6', c2: '#a78bfa', c3: '#22d3ee' },
  green: { label: 'Зелёный', c1: '#34d399', c2: '#a3e635', c3: '#22d3ee' },
  amber: { label: 'Янтарный', c1: '#fbbf24', c2: '#fb923c', c3: '#a78bfa' },
  red: { label: 'Красный', c1: '#f87171', c2: '#fb923c', c3: '#a78bfa' },
};

export const FONT_PRESETS: { id: string; label: string }[] = [
  { id: "ui-monospace, 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace", label: 'Системный моноширинный' },
  { id: "'JetBrains Mono', ui-monospace, monospace", label: 'JetBrains Mono' },
  { id: "'Fira Code', ui-monospace, monospace", label: 'Fira Code' },
  { id: "'Cascadia Code', ui-monospace, monospace", label: 'Cascadia Code' },
  { id: "'IBM Plex Mono', ui-monospace, monospace", label: 'IBM Plex Mono' },
  { id: "'SF Mono', ui-monospace, monospace", label: 'SF Mono' },
  { id: "Consolas, 'Courier New', monospace", label: 'Consolas' },
  { id: "monospace", label: 'Обычный monospace' },
];

export type Settings = {
  theme: 'dark' | 'light';
  accent: AccentKey;
  fontFamily: string;
  fontSize: number;
  fontLigatures: boolean;
  lineHeight: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'off' | 'on';
  minimap: boolean;
  cursorStyle: 'line' | 'line-thin' | 'block' | 'underline' | 'block-outline';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorWidth: number;
  smoothCaret: boolean;
  mouseWheelZoom: boolean;
  autoClosingBrackets: boolean;
  quickSuggestions: boolean;
  bracketPairColorization: boolean;
  indentGuides: boolean;
  renderLineHighlight: 'all' | 'line' | 'none';
  stickyScroll: boolean;
  paddingY: number;
  trail: boolean;
  trailIntensity: number;
  glow: boolean;
  glowIntensity: number;
  particles: boolean;
  particlesIntensity: number;
  showHidden: boolean;
  shell: ShellId;
  terminalFontSize: number;
  customShells: CustomShell[];
};

export type Activity = 'explorer' | 'search' | 'languages' | 'settings' | 'source' | 'funo';

export type ShellId = string; // preset: 'shell'|'nu'|'pwsh'|'cmd'|'zsh'|'fish' | custom: 'custom:<name>'

export const SHELLS: { id: ShellId; label: string; desc: string; badge: string; badgeBg: string; badgeFg: string }[] = [
  { id: 'shell', label: 'shell', desc: 'оболочка по умолчанию', badge: '$', badgeBg: '#3f4a63', badgeFg: '#fff' },
  { id: 'nu', label: 'nu', desc: 'Nushell', badge: '❯', badgeBg: '#29d8db', badgeFg: '#0b0e17' },
  { id: 'pwsh', label: 'pwsh', desc: 'PowerShell 7', badge: 'PS', badgeBg: '#2672bf', badgeFg: '#fff' },
  { id: 'cmd', label: 'cmd', desc: 'Командная строка Windows', badge: 'C:', badgeBg: '#a1a1a1', badgeFg: '#0b0e17' },
  { id: 'zsh', label: 'zsh', desc: 'Z shell', badge: '%', badgeBg: '#e23b4e', badgeFg: '#fff' },
  { id: 'fish', label: 'fish', desc: 'Friendly Interactive SHell', badge: '>_', badgeBg: '#24b9a8', badgeFg: '#fff' },
];

export const SHELL_PRESET_IDS = new Set(SHELLS.map((s) => s.id));

export type CustomShell = { name: string; command: string };

export const customShellId = (name: string) => 'custom:' + name;

export type TaskCommands = Record<string, string>;

export type MenuItemDef = { label: string; danger?: boolean; run: () => void };
export type MenuState = { x: number; y: number; items: (MenuItemDef | 'sep')[] };
export type PaletteState = { mode: 'command' | 'quick' };
export type CursorInfo = { line: number; col: number };
export type CommandDef = { id: string; label: string; key?: string; run: () => void };
export type CreateRequest = { parentPath: string; kind: 'file' | 'dir' } | null;

export type EditorApi = {
  focus: () => void;
  format: () => void;
  getValue: () => string;
  reveal: (line: number, col?: number) => void;
};

/** Tiny event emitter used for high-frequency events (cursor moves). */
export class Emitter<T> {
  private subs = new Set<(v: T) => void>();
  subscribe(fn: (v: T) => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  emit(v: T) {
    this.subs.forEach((fn) => fn(v));
  }
}

export interface IdeApi {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  workspace: Workspace | null;
  openFiles: OpenFile[];
  activePath: string | null;
  dirty: Record<string, boolean>;
  activity: Activity;
  sidebarOpen: boolean;
  palette: PaletteState | null;
  menu: MenuState | null;
  createRequest: CreateRequest;
  savedRef: MutableRefObject<Map<string, string>>;
  cursorEmitter: Emitter<CursorInfo>;
  openFile: (path: string) => void;
  setActivePath: (path: string | null) => void;
  closeTab: (path: string) => void;
  saveActive: () => void;
  openFolder: () => void;
  resetDemo: () => void;  refreshTree: () => void;
  doFsOp: (op: () => Promise<void>, then?: () => void) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  revealLine: (path: string, line: number) => void;
  requestCreate: (parentPath: string, kind: 'file' | 'dir') => void;
  clearCreateRequest: () => void;
  setActivity: (a: Activity) => void;
  setSidebarOpen: (v: boolean) => void;
  setPalette: (p: PaletteState | null) => void;
  setMenu: (m: MenuState | null) => void;
  toast: (msg: string) => void;
  setDirtyFor: (path: string, v: boolean) => void;
  registerEditorApi: (api: EditorApi | null) => void;
  commands: CommandDef[];
  treeFiles: () => { path: string; name: string }[];
  panelOpen: boolean;
  panelTab: 'terminal' | 'tasks';
  setPanelOpen: (v: boolean) => void;
  setPanelTab: (t: 'terminal' | 'tasks') => void;
  taskCommands: TaskCommands;
  taskRequest: { nonce: number; name: string; command: string } | null;
  requestTask: (name: string, command: string) => void;
  openConfigFile: () => void;
  reloadConfig: () => void;
}
