// ─── File-system bridge: Tauri (real FS) ↔ Virtual (in-memory demo) ─────────

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { VirtualFS } from './virtual';
import type { FsNode, Workspace } from '../types';

export const isTauri: boolean =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const vfs = new VirtualFS();

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'target', 'dist', 'build', 'out', '.next', '.nuxt',
  '.cache', '__pycache__', '.venv', 'vendor', '.parcel-cache', 'coverage',
]);

async function loadRealDir(
  path: string,
  depth: number,
  maxDepth: number,
  showHidden: boolean
): Promise<FsNode> {
  // normalize Windows separators, just in case
  path = path.replace(/\\/g, '/');
  const name = path.slice(path.lastIndexOf('/') + 1) || path;
  const node: FsNode = { name, path, kind: 'dir', children: [] };
  if (depth >= maxDepth) return node;

  let entries: { name: string; path: string; isDir: boolean; size?: number }[] = [];
  try {
    entries = await invoke('list_dir', { path });
  } catch (err) {
    console.error('list_dir failed:', path, err);
    return node;
  }

  entries = entries
    .filter((e) => showHidden || !e.name.startsWith('.'))
    .filter((e) => !e.isDir || !SKIP_DIRS.has(e.name));

  for (const e of entries) {
    if (e.isDir) {
      node.children!.push(await loadRealDir(e.path, depth + 1, maxDepth, showHidden));
    } else {
      node.children!.push({ name: e.name, path: e.path, kind: 'file', size: e.size });
    }
  }
  node.children!.sort((a, b) =>
    a.kind !== b.kind ? (a.kind === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)
  );
  return node;
}

export async function loadWorkspaceTree(
  path: string,
  mode: 'virtual' | 'real',
  showHidden: boolean
): Promise<FsNode> {
  if (mode === 'virtual') return vfs.getTree();
  return loadRealDir(path, 0, 6, showHidden);
}

// ─── file operations ────────────────────────────────────────────────────────

export async function readFileText(ws: Workspace, path: string): Promise<string> {
  if (ws.mode === 'virtual') return vfs.readFile(path);
  return (await invoke('read_file', { path })) as string;
}

export async function writeFileText(ws: Workspace, path: string, content: string): Promise<void> {
  if (ws.mode === 'virtual') {
    vfs.writeFile(path, content);
  } else {
    await invoke('write_file', { path, content });
  }
}

export async function createFile(ws: Workspace, path: string): Promise<void> {
  if (ws.mode === 'virtual') vfs.createFile(path);
  else await invoke('create_file', { path });
}

export async function createDir(ws: Workspace, path: string): Promise<void> {
  if (ws.mode === 'real') await invoke('create_dir', { path });
  // virtual mode: dirs are implicit
}

export async function deletePath(ws: Workspace, path: string): Promise<void> {
  if (ws.mode === 'virtual') vfs.deletePath(path);
  else await invoke('delete_path', { path });
}

export async function renamePath(ws: Workspace, oldPath: string, newPath: string): Promise<void> {
  if (ws.mode === 'virtual') vfs.rename(oldPath, newPath);
  else await invoke('rename_path', { oldPath, newPath });
}

export async function openFolderDialog(title = 'Открыть папку'): Promise<string | null> {
  if (!isTauri) return null;
  try {
    const dir = await open({ directory: true, multiple: false, title });
    return typeof dir === 'string' ? dir.replace(/\\/g, '/') : null;
  } catch (err) {
    console.error('open folder failed:', err);
    return null;
  }
}
