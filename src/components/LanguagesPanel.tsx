import { useMemo, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { FsNode, IdeApi } from '../types';
import { EXT_COLORS } from '../editor/monacoSetup';
import { SearchIcon } from './icons';

const POPULAR = new Set([
  'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'csharp',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'lua', 'zig', 'haskell', 'elixir',
  'clojure', 'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'shell', 'vue', 'svelte',
]);

export default function LanguagesPanel({ ide }: { ide: IdeApi }) {
  const [q, setQ] = useState('');

  const langs = useMemo(() => {
    return monaco.languages
      .getLanguages()
      .filter((l) => l.id && !l.id.startsWith('_'))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return langs;
    return langs.filter(
      (l) =>
        l.id.toLowerCase().includes(query) ||
        (l.aliases ?? []).some((a) => a.toLowerCase().includes(query))
    );
  }, [langs, q]);

  const openSample = (langId: string) => {
    const ws = ide.workspace;
    if (!ws) return;
    const lang = langs.find((l) => l.id === langId);
    const ext = lang?.extensions?.[0]?.replace('.', '');
    if (!ext) {
      ide.toast(langId + ' — язык поддерживается, демо-файла нет');
      return;
    }
    const walk = (n: FsNode): string | null => {
      if (n.kind === 'file') {
        if (n.name.endsWith('.' + ext)) return n.path;
        return null;
      }
      for (const c of n.children ?? []) {
        const r = walk(c);
        if (r) return r;
      }
      return null;
    };
    const p = walk(ws.tree);
    if (p) ide.openFile(p);
    else ide.toast(langId + ' — язык поддерживается, демо-файла нет');
  };

  return (
    <div className="lang-panel">
      <div className="panel-header">
        <span className="panel-title">Languages</span>
        <span className="panel-count">{langs.length}</span>
      </div>
      <div className="search-input-wrap">
        <SearchIcon size={14} />
        <input
          className="search-input"
          placeholder="Найти язык…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="lang-list">
        {filtered.map((l) => {
          const ext = l.extensions?.[0]?.replace('.', '') ?? '';
          const color = EXT_COLORS[ext] || '#9aa7c4';
          const pop = POPULAR.has(l.id);
          return (
            <button key={l.id} className="lang-row" onClick={() => openSample(l.id)} title={l.id}>
              <span className="file-dot" style={{ background: color }} />
              <span className="lang-name">{l.id}</span>
              {pop && <span className="lang-pop">популярный</span>}
              {ext && <span className="lang-ext">{'.' + ext}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
