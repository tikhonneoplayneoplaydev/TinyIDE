import { isTauri } from '../fs/bridge';
import { CometLogo, CloseIcon, MaximizeIcon, MinusIcon, RestoreIcon } from './icons';
import { useEffect, useState } from 'react';

async function win() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export default function TitleBar({ activeFile }: { activeFile: string | null }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    let unsub: (() => void) | undefined;
    (async () => {
      const w = await win();
      setMaximized(await w.isMaximized());
      unsub = await w.onResized(() => w.isMaximized().then(setMaximized));
    })();
    return () => unsub?.();
  }, []);

  const min = () => win().then((w) => w.minimize());
  const max = () => win().then((w) => w.toggleMaximize());
  const close = () => win().then((w) => w.close());

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <CometLogo className="titlebar-logo" />
        <span className="titlebar-name">TinyIDE</span>
        {activeFile && <span className="titlebar-file">{activeFile}</span>}
      </div>
      <div className="titlebar-center" data-tauri-drag-region>
        {!isTauri && <span className="web-badge">browser preview</span>}
      </div>
      {isTauri && (
        <div className="titlebar-controls">
          <button className="win-btn" onClick={min} title="Свернуть" aria-label="Свернуть">
            <MinusIcon />
          </button>
          <button className="win-btn" onClick={max} title="Развернуть" aria-label="Развернуть">
            {maximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>
          <button className="win-btn win-btn-close" onClick={close} title="Закрыть" aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
