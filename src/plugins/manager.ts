// ─── Менеджер WASM-плагинов: загрузка, регистрация языков в Monaco ────────
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { callPlugin, listPlugins } from './bridge';
import type { PluginInfo } from './bridge';

export type LoadedPlugin = PluginInfo & { loaded: boolean; enabled: boolean };

const ENABLED_KEY = 'tinyide.plugins.enabled';
const loadedPlugins: LoadedPlugin[] = [];

export function getPlugins(): LoadedPlugin[] {
  return loadedPlugins;
}

export function isPluginEnabled(name: string): boolean {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (!raw) return true; // по умолчанию все включены
    const set = JSON.parse(raw) as string[];
    return set.includes(name);
  } catch {
    return true;
  }
}

function setPluginEnabled(name: string, enabled: boolean) {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    const set = raw ? (JSON.parse(raw) as string[]) : [];
    const next = enabled ? [...new Set([...set, name])] : set.filter((n) => n !== name);
    localStorage.setItem(ENABLED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  const p = loadedPlugins.find((x) => x.name === name);
  if (p) {
    p.enabled = enabled;
    if (!enabled) p.loaded = false;
  }
}

export async function togglePlugin(name: string): Promise<void> {
  const p = loadedPlugins.find((x) => x.name === name);
  if (!p) return;
  const next = !p.enabled;
  setPluginEnabled(name, next);
  if (next) {
    try {
      await initPlugin(p);
    } catch (e) {
      console.error('plugin init failed:', e);
    }
  }
}

/** Инициализация всех включённых плагинов при старте приложения. */
export async function loadPluginSystem(): Promise<void> {
  let infos: PluginInfo[];
  try {
    infos = await listPlugins();
  } catch (e) {
    console.error('plugins list failed:', e);
    return;
  }
  loadedPlugins.length = 0;
  for (const info of infos) {
    loadedPlugins.push({ ...info, loaded: false, enabled: isPluginEnabled(info.name) });
  }
  for (const p of loadedPlugins) {
    if (p.enabled) {
      try {
        await initPlugin(p);
      } catch (e) {
        console.error('plugin ' + p.name + ' init failed:', e);
      }
    }
  }
}

async function initPlugin(p: LoadedPlugin) {
  const info = await callPlugin<{
    languages?: { id: string; extensions?: string[]; aliases?: string[] }[];
    commands?: string[];
    description?: string;
  }>(p.name, 'init');
  if (info.languages) {
    for (const lang of info.languages) {
      registerLanguageFromPlugin(p.name, lang);
    }
  }
  p.loaded = true;
}

function registerLanguageFromPlugin(
  pluginName: string,
  lang: { id: string; extensions?: string[]; aliases?: string[] }
) {
  const exists = monaco.languages.getLanguages().some((l) => l.id === lang.id);
  if (!exists) {
    monaco.languages.register({ id: lang.id, extensions: lang.extensions, aliases: lang.aliases });
  }
  // провайдер автодополнения через плагин
  monaco.languages.registerCompletionItemProvider(lang.id, {
    triggerCharacters: ['.', '(', ' ', 'i', 'p', 'l'],
    async provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const wordText = word.word;
      const items = await callPlugin<{ items?: { label: string; insertText: string; documentation?: string; kind?: number }[] }>(
        pluginName,
        'completions',
        { language: lang.id, word: wordText }
      );
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
      return {
        suggestions: (items.items ?? []).map((it) => ({
          label: it.label,
          insertText: it.insertText,
          detail: pluginName + ' plugin',
          documentation: it.documentation,
          kind: (it.kind ?? 2) as monaco.languages.CompletionItemKind,
          range,
        })),
      };
    },
  });
  // outline документа через плагин (breadcrumbs + ctrl+shift+o)
  monaco.languages.registerDocumentSymbolProvider(lang.id, {
    async provideDocumentSymbols(model) {
      const symbols = await callPlugin<
        { name: string; detail?: string; line: number; kind?: number }[]
      >(pluginName, 'outline', { language: lang.id, source: model.getValue() });
      return symbols.map((s) => ({
        name: s.name,
        detail: s.detail,
        kind: (s.kind ?? 3) as monaco.languages.SymbolKind,
        range: new monaco.Range(s.line, 1, s.line, 1),
        selectionRange: new monaco.Range(s.line, 1, s.line, 1),
      }));
    },
  });
}

/** Диагностика через плагин (funo). */
export async function pluginDiagnose(pluginName: string, language: string, source: string): Promise<unknown[]> {
  return callPlugin<unknown[]>(pluginName, 'diagnose', { language, source });
}

/** Транспиляция через плагин. */
export async function pluginTranspile(
  pluginName: string,
  language: string,
  source: string
): Promise<{ ok: boolean; java?: string; errors?: unknown[] }> {
  return callPlugin(pluginName, 'transpile', { language, source });
}
