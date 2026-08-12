import { useCallback, useEffect, useState } from 'react';
import type { IdeApi } from '../types';
import { gitStatus } from '../terminal/bridge';
import { isTauri } from '../fs/bridge';
import { GitIcon, RefreshIcon } from './icons';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  M: { label: 'изменён', cls: 'st-modified' },
  A: { label: 'добавлен', cls: 'st-added' },
  D: { label: 'удалён', cls: 'st-deleted' },
  R: { label: 'переименован', cls: 'st-renamed' },
  U: { label: 'конфликт', cls: 'st-conflict' },
  '??': { label: 'не отслеживается', cls: 'st-untracked' },
};

export default function GitPanel({ ide }: { ide: IdeApi }) {
  const [branch, setBranch] = useState<string | null>(null);
  const [files, setFiles] = useState<{ path: string; status: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const ws = ide.workspace;
    if (!ws) return;
    if (!isTauri) {
      setErr('Git-панель доступна в десктоп-версии (Tauri). В веб-демо — только просмотр файлов.');
      return;
    }
    setLoading(true);
    try {
      const info = await gitStatus(ws.rootPath);
      setBranch(info.branch);
      setFiles(info.files);
      setErr(null);
    } catch (e) {
      setErr(String(e));
      setFiles([]);
      setBranch(null);
    } finally {
      setLoading(false);
    }
  }, [ide.workspace]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="git-panel">
      <div className="panel-header">
        <span className="panel-title">Source Control</span>
        <div className="panel-actions">
          <button title="Обновить" onClick={() => load()}>
            <RefreshIcon size={13} />
          </button>
        </div>
      </div>
      <div className="git-branch">
        <GitIcon size={15} />
        <span>{branch ?? '—'}</span>
      </div>
      {err && <div className="git-empty">{err}</div>}
      {!err && files.length === 0 && !loading && (
        <div className="git-empty">Изменений нет — рабочее дерево чистое ✨</div>
      )}
      <div className="git-list">
        {files.map((f, i) => {
          const meta = STATUS_META[f.status] ?? { label: f.status, cls: 'st-modified' };
          return (
            <div
              key={i}
              className="git-file"
              title={f.path}
              onClick={() => ide.openFile(f.path)}
            >
              <span className={`git-status ${meta.cls}`}>{meta.label}</span>
              <span className="git-path">{f.path}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
