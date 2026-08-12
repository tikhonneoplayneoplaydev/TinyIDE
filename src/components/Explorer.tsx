import { useEffect, useState } from 'react';
import type { FsNode, IdeApi, MenuItemDef } from '../types';
import { colorForPath } from '../editor/monacoSetup';
import { createDir as fsCreateDir, createFile as fsCreateFile, deletePath as fsDeletePath } from '../fs/bridge';
import { ChevronIcon, FolderIcon, PlusIcon, RefreshIcon } from './icons';

export default function Explorer({ ide }: { ide: IdeApi }) {
  const ws = ide.workspace;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<{ path: string; name: string } | null>(null);

  // seed expansion when workspace switches
  useEffect(() => {
    if (!ws) return;
    const tree = ws.tree;
    const exp = new Set<string>();
    const seed = (n: FsNode, depth: number) => {
      if (n.kind !== 'dir') return;
      if (depth <= 1) exp.add(n.path);
      n.children?.forEach((c) => seed(c, depth + 1));
    };
    seed(tree, 0);
    setExpanded(exp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.rootPath]);

  // ensure parent of a create request is expanded
  useEffect(() => {
    if (ide.createRequest) {
      setExpanded((prev) => new Set(prev).add(ide.createRequest!.parentPath));
    }
  }, [ide.createRequest]);

  if (!ws) return null;

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });

  const visible = (n: FsNode) => ide.settings.showHidden || !n.name.startsWith('.');

  const openMenu = (e: React.MouseEvent, node: FsNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    const base: (MenuItemDef | 'sep')[] = [
      { label: 'New File', run: () => ide.requestCreate(node ? node.path : ws.rootPath, 'file') },
      { label: 'New Folder', run: () => ide.requestCreate(node ? node.path : ws.rootPath, 'dir') },
      'sep',
    ];
    if (node) {
      if (node.kind === 'dir') {
        base.push({ label: 'Collapse All', run: () => setExpanded(new Set()) });
      }
      base.push(
        { label: 'Rename…', run: () => setRenaming({ path: node.path, name: node.name }) },
        {
          label: 'Delete',
          danger: true,
          run: () => {
            ide.doFsOp(() => fsDeletePath(ws, node.path)).then(() => {
              const prefix = node.path + (node.kind === 'dir' ? '/' : '');
              ide.openFiles.forEach((f) => {
                if (f.path === node.path || f.path.startsWith(prefix)) ide.closeTab(f.path);
              });
              ide.toast(`Удалено: ${node.name}`);
            });
          },
        },
        'sep',
        {
          label: 'Copy Path',
          run: () => {
            navigator.clipboard?.writeText(node.path).catch(() => undefined);
            ide.toast('Путь скопирован');
          },
        }
      );
    } else {
      base.push({ label: 'Refresh', run: () => ide.refreshTree() });
    }
    ide.setMenu({ x: e.clientX, y: e.clientY, items: base });
  };

  const renderNode = (node: FsNode, depth: number): React.ReactNode => {
    if (!visible(node)) return null;
    const isOpen = expanded.has(node.path);

    if (node.kind === 'dir') {
      return (
        <div key={node.path}>
          <div
            className="tree-row"
            style={{ '--depth': depth } as React.CSSProperties}
            onClick={() => toggle(node.path)}
            onContextMenu={(e) => openMenu(e, node)}
            title={node.path}
          >
            <ChevronIcon className={`tree-chevron ${isOpen ? 'open' : ''}`} size={13} />
            <FolderIcon size={15} open={isOpen} />
            <span className="tree-name">{node.name}</span>
          </div>
          <div className={`tree-children ${isOpen ? 'open' : ''}`}>
            <div className="tree-children-inner">
              {node.children?.map((c) => renderNode(c, depth + 1))}
              {ide.createRequest?.parentPath === node.path && (
                <CreateInput ide={ide} parentPath={node.path} kind={ide.createRequest.kind} depth={depth + 1} />
              )}
            </div>
          </div>
        </div>
      );
    }

    const isActive = node.path === ide.activePath;
    const isRenaming = renaming?.path === node.path;
    if (isRenaming) {
      return (
        <RenameInput
          key={node.path}
          ide={ide}
          node={node}
          depth={depth}
          cancel={() => setRenaming(null)}
        />
      );
    }

    return (
      <div
        key={node.path}
        className={`tree-row ${isActive ? 'active' : ''}`}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={() => ide.openFile(node.path)}
        onContextMenu={(e) => openMenu(e, node)}
        title={node.path}
      >
        <span className="tree-indent" />
        <span className="file-dot" style={{ background: colorForPath(node.path) }} />
        <span className="tree-name">{node.name}</span>
      </div>
    );
  };

  const rootOpen = expanded.has(ws.rootPath);

  return (
    <div className="explorer">
      <div className="panel-header">
        <span className="panel-title">Explorer</span>
        <div className="panel-actions">
          <button title="New File" onClick={() => ide.requestCreate(ws.rootPath, 'file')}>
            <PlusIcon size={13} />
          </button>
          <button title="New Folder" onClick={() => ide.requestCreate(ws.rootPath, 'dir')}>
            <FolderIcon size={13} />
          </button>
          <button title="Refresh" onClick={() => ide.refreshTree()}>
            <RefreshIcon size={13} />
          </button>
        </div>
      </div>
      <div className="explorer-tree" onContextMenu={(e) => openMenu(e, null)}>
        <div className="root-row" onClick={() => toggle(ws.rootPath)}>
          <ChevronIcon className={`tree-chevron ${rootOpen ? 'open' : ''}`} size={13} />
          <FolderIcon size={15} open={rootOpen} />
          <span className="root-name">{ws.rootName}</span>
          {ws.mode === 'virtual' && <span className="root-badge">example</span>}
        </div>
        <div className={`tree-children ${rootOpen ? 'open' : ''}`}>
          <div className="tree-children-inner">
            {ws.tree.children?.map((c) => renderNode(c, 0))}
            {ide.createRequest?.parentPath === ws.rootPath && (
              <CreateInput ide={ide} parentPath={ws.rootPath} kind={ide.createRequest.kind} depth={0} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── inline create input ────────────────────────────────────────────────────

function CreateInput({
  ide, parentPath, kind, depth,
}: {
  ide: IdeApi;
  parentPath: string;
  kind: 'file' | 'dir';
  depth: number;
}) {
  const [name, setName] = useState(kind === 'dir' ? 'new-folder' : 'new-file.txt');

  const commit = () => {
    const n = name.trim();
    ide.clearCreateRequest();
    if (!n || n.includes('/')) return;
    const ws = ide.workspace;
    if (!ws) return;
    const path = parentPath + '/' + n;
    ide.doFsOp(() => (kind === 'file' ? fsCreateFile(ws, path) : fsCreateDir(ws, path)));
  };

  return (
    <div className="tree-row create-row" style={{ '--depth': depth } as React.CSSProperties}>
      {kind === 'dir' ? <FolderIcon size={15} /> : <span className="file-dot" style={{ background: '#9aa7c4' }} />}
      <input
        className="tree-input"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') ide.clearCreateRequest();
        }}
        onBlur={() => ide.clearCreateRequest()}
        onFocus={(e) => {
          const dot = name.lastIndexOf('.');
          e.target.select();
          if (dot > 0) e.target.setSelectionRange(0, dot);
        }}
      />
    </div>
  );
}

// ─── inline rename input ────────────────────────────────────────────────────

function RenameInput({
  ide, node, depth, cancel,
}: {
  ide: IdeApi;
  node: FsNode;
  depth: number;
  cancel: () => void;
}) {
  const [name, setName] = useState(node.name);

  const commit = () => {
    const n = name.trim();
    cancel();
    if (!n || n === node.name || n.includes('/')) return;
    const parent = node.path.slice(0, node.path.lastIndexOf('/'));
    ide.renameFile(node.path, parent + '/' + n);
  };

  return (
    <div className="tree-row create-row" style={{ '--depth': depth } as React.CSSProperties}>
      {node.kind === 'dir' ? (
        <FolderIcon size={15} />
      ) : (
        <span className="file-dot" style={{ background: colorForPath(node.path) }} />
      )}
      <input
        className="tree-input"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        onBlur={commit}
        onFocus={(e) => {
          const dot = name.lastIndexOf('.');
          e.target.select();
          if (dot > 0) e.target.setSelectionRange(0, dot);
        }}
      />
    </div>
  );
}
