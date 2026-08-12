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

export type Settings = {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  wordWrap: 'off' | 'on';
  minimap: boolean;
  cursorStyle: 'line' | 'line-thin' | 'block' | 'underline' | 'block-outline';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  trail: boolean;
  glow: boolean;
  particles: boolean;
  showHidden: boolean;
};

export type Activity = 'explorer' | 'search' | 'languages' | 'settings';

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
  resetDemo: () => void;
  refreshTree: () => void;
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
}
