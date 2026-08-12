import { useEffect, useState } from 'react';
import type { FsNode, IdeApi } from '../types';
import { readFileText } from '../fs/bridge';
import { SearchIcon } from './icons';

type Result = { path: string; name: string; line: number; text: string };

export default function SearchPanel({ ide }: { ide: IdeApi }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const ws = ide.workspace;
    if (!q || !ws) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      const out: Result[] = [];
      const walk = async (n: FsNode) => {
        if (cancelled || out.length >= 300) return;
        if (n.kind === 'file') {
          if ((n.size ?? 0) > 512_000) return;
          try {
            const content = await readFileText(ws, n.path);
            const lines = content.split('\n');
            for (let i = 0; i < lines.length && out.length < 300; i++) {
              if (lines[i].toLowerCase().includes(q)) {
                out.push({ path: n.path, name: n.name, line: i + 1, text: lines[i].trim().slice(0, 160) });
              }
            }
          } catch {
            /* unreadable file */
          }
        } else {
          for (const c of n.children ?? []) await walk(c);
        }
      };
      await walk(ws.tree);
      if (!cancelled) {
        setResults(out);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, ide.workspace, ide.settings.showHidden]);

  const count = results.length;
  const files = new Set(results.map((r) => r.path)).size;

  return (
    <div className="search-panel">
      <div className="panel-header">
        <span className="panel-title">Search</span>
      </div>
      <div className="search-input-wrap">
        <SearchIcon size={14} />
        <input
          className="search-input"
          placeholder="Поиск по файлам…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      {query.trim() && (
        <div className="search-summary">
          {searching ? 'Поиск…' : `${count} совпадений в ${files} файлах`}
        </div>
      )}
      <div className="search-results">
        {results.map((r, i) => (
          <div key={i} className="search-result" onClick={() => ide.revealLine(r.path, r.line)} title={r.path}>
            <span className="search-result-head">
              <span className="search-result-name">{r.name}</span>
              <span className="search-result-line">:{r.line}</span>
            </span>
            <span className="search-result-text">{r.text}</span>
          </div>
        ))}
        {!searching && query.trim() && results.length === 0 && (
          <div className="search-empty">Ничего не найдено</div>
        )}
      </div>
    </div>
  );
}
