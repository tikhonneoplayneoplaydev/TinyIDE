import { useEffect, useMemo, useRef, useState } from 'react';
import type { IdeApi } from '../types';
import { FileIcon } from './icons';

function fuzzyScore(q: string, s: string): number {
  q = q.toLowerCase();
  s = s.toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  let last = -2;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) {
      score += 1 + (i === last + 1 ? streak * 0.6 : 0) + (i === 0 || s[i - 1] === ' ' || s[i - 1] === '/' ? 2 : 0);
      streak++;
      last = i;
      qi++;
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score : -1;
}

type Row = { key: string; label: string; hint?: string; run: () => void };

export default function Palette({ ide }: { ide: IdeApi }) {
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const quick = ide.palette!.mode === 'quick';

  const rows: Row[] = useMemo(() => {
    if (quick) {
      return ide.treeFiles().map((f) => ({
        key: f.path,
        label: f.name,
        hint: f.path,
        run: () => ide.openFile(f.path),
      }));
    }
    return ide.commands.map((c) => ({
      key: c.id,
      label: c.label,
      hint: c.key,
      run: c.run,
    }));
  }, [ide, quick]);

  const filtered = useMemo(() => {
    const scored = rows
      .map((r) => ({ r, s: fuzzyScore(query, r.label) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, 14).map((x) => x.r);
  }, [rows, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setIdx(0);
  }, [query, quick]);

  useEffect(() => {
    const el = listRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  const run = (r: Row) => {
    ide.setPalette(null);
    r.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ide.setPalette(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = filtered[idx];
      if (r) run(r);
    }
  };

  return (
    <div className="palette-overlay" onMouseDown={() => ide.setPalette(null)}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={quick ? 'Введите имя файла…' : 'Введите команду…'}
        />
        <div className="palette-list" ref={listRef}>
          {filtered.length === 0 && <div className="palette-empty">Ничего не найдено</div>}
          {filtered.map((r, i) => (
            <div
              key={r.key}
              className={`palette-item ${i === idx ? 'hl' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => run(r)}
            >
              <span className="palette-label">
                {quick && <FileIcon size={13} className="palette-file-icon" />}
                {r.label}
              </span>
              {r.hint && <span className="palette-hint">{r.hint}</span>}
            </div>
          ))}
        </div>
        <div className="palette-footer">
          <span>↑↓ — навигация</span>
          <span>↵ — выполнить</span>
          <span>Esc — закрыть</span>
        </div>
      </div>
    </div>
  );
}
