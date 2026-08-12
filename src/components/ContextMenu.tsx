import { useEffect, useRef } from 'react';
import type { IdeApi } from '../types';

export default function ContextMenu({ ide }: { ide: IdeApi }) {
  const menu = ide.menu!;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ide.setMenu(null);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [ide]);

  const left = Math.min(menu.x, window.innerWidth - 240);
  const top = Math.min(menu.y, window.innerHeight - menu.items.length * 34 - 40);

  return (
    <div className="menu-overlay">
      <div ref={ref} className="menu" style={{ left, top }}>
        {menu.items.map((item, i) =>
          item === 'sep' ? (
            <div key={i} className="menu-sep" />
          ) : (
            <button
              key={i}
              className={`menu-item ${item.danger ? 'danger' : ''}`}
              onClick={() => {
                ide.setMenu(null);
                item.run();
              }}
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
