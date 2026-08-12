import type { IdeApi } from '../types';
import { LangLogo } from '../languages/LangLogo';
import { CloseIcon } from './icons';

export default function TabsBar({ ide }: { ide: IdeApi }) {
  const { openFiles, activePath, dirty } = ide;

  return (
    <div className="tabs">
      {openFiles.length === 0 && <div className="tabs-empty" />}
      {openFiles.map((f) => {
        const active = f.path === activePath;
        const isDirty = !!dirty[f.path];
        return (
          <div
            key={f.path}
            className={`tab ${active ? 'active' : ''}`}
            onClick={() => ide.setActivePath(f.path)}
            onAuxClick={(e) => {
              if (e.button === 1) ide.closeTab(f.path);
            }}
            title={f.path}
          >
            <LangLogo lang={f.language} size={14} />
            <span className="tab-name">{f.name}</span>
            {isDirty ? (
              <span className="tab-dirty" title="Не сохранено" />
            ) : (
              <button
                className="tab-close"
                title="Закрыть (Ctrl+W)"
                onClick={(e) => {
                  e.stopPropagation();
                  ide.closeTab(f.path);
                }}
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
