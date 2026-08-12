// ─── Мост к WASM-плагинам: Tauri (wasmi) ↔ браузер (нативный WebAssembly) ─
// Один и тот же ABI: alloc/dealloc/tinyide_handle(cmd, len, out, cap) -> len.
// В браузере загружаем тот же .wasm и исполняем напрямую.

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../fs/bridge';

export type PluginInfo = {
  name: string;
  display_name: string;
  publisher: string;
  version: string;
  description: string;
  builtin: boolean;
  size_kb: number;
};

type WasmExports = {
  alloc: (len: number) => number;
  dealloc: (ptr: number, len: number) => void;
  tinyide_handle: (cmdPtr: number, cmdLen: number, outPtr: number, outCap: number) => number;
  memory: WebAssembly.Memory;
};

const cache = new Map<string, WasmExports>();

async function loadWasmExports(name: string): Promise<WasmExports> {
  const hit = cache.get(name);
  if (hit) return hit;
  const res = await fetch(`plugins/${name}/plugin.wasm`);
  if (!res.ok) throw new Error('плагин не найден: ' + name);
  const bytes = await res.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: { log: () => undefined },
  });
  const ex = instance.exports as unknown as WasmExports;
  cache.set(name, ex);
  return ex;
}

/** Вызов плагина: команда (JSON) → ответ (JSON). */
export async function callPlugin<T = unknown>(name: string, cmd: string, payload: Record<string, unknown> = {}): Promise<T> {
  const request = JSON.stringify({ cmd, ...payload });
  if (isTauri) {
    const res = await invoke<string>('plugins_call', { name, cmd: request });
    return JSON.parse(res) as T;
  }
  const ex = await loadWasmExports(name);
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const cmdBytes = enc.encode(request);
  const cmdPtr = ex.alloc(cmdBytes.length);
  new Uint8Array(ex.memory.buffer, cmdPtr, cmdBytes.length).set(cmdBytes);
  const OUT_CAP = 1 << 20;
  const outPtr = ex.alloc(OUT_CAP);
  const n = ex.tinyide_handle(cmdPtr, cmdBytes.length, outPtr, OUT_CAP);
  const out = dec.decode(new Uint8Array(ex.memory.buffer, outPtr, n));
  ex.dealloc(cmdPtr, cmdBytes.length);
  ex.dealloc(outPtr, OUT_CAP);
  return JSON.parse(out) as T;
}

export async function listPlugins(): Promise<PluginInfo[]> {
  if (isTauri) return invoke<PluginInfo[]>('plugins_list');
  // в вебе — встроенный плагин funo
  try {
    await loadWasmExports('funo');
    return [{
      name: 'funo',
      display_name: 'Funo Language',
      publisher: 'TinyIDE',
      version: '1.0.0',
      description: 'Funo — язык, компилируемый в Java/JVM. Автодополнение, диагностика, транспиляция, outline.',
      builtin: true,
      size_kb: 959,
    }];
  } catch {
    return [];
  }
}

export async function installPlugin(sourceDir: string): Promise<string> {
  if (!isTauri) throw new Error('Установка плагинов доступна в десктоп-версии');
  return invoke<string>('plugins_install', { sourceDir });
}

export async function uninstallPlugin(name: string): Promise<void> {
  if (!isTauri) throw new Error('Удаление плагинов доступно в десктоп-версии');
  return invoke('plugins_uninstall', { name });
}
