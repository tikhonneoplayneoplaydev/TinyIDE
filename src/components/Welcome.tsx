import type { FsNode, IdeApi } from '../types';
import { EXT_COLORS } from '../editor/monacoSetup';
import { CometLogo } from './icons';

const CHIPS: [string, string][] = [
  ['py', 'Python'], ['rs', 'Rust'], ['go', 'Go'], ['ts', 'TypeScript'],
  ['js', 'JavaScript'], ['java', 'Java'], ['cpp', 'C++'], ['c', 'C'],
  ['cs', 'C#'], ['rb', 'Ruby'], ['php', 'PHP'], ['swift', 'Swift'],
  ['kt', 'Kotlin'], ['scala', 'Scala'], ['dart', 'Dart'], ['lua', 'Lua'],
  ['zig', 'Zig'], ['hs', 'Haskell'], ['ex', 'Elixir'], ['clj', 'Clojure'],
  ['sql', 'SQL'], ['html', 'HTML'], ['css', 'CSS'], ['scss', 'SCSS'],
  ['json', 'JSON'], ['yaml', 'YAML'], ['toml', 'TOML'], ['md', 'Markdown'],
  ['sh', 'Shell'], ['ps1', 'PowerShell'], ['vue', 'Vue'], ['svelte', 'Svelte'],
];

export default function Welcome({ ide }: { ide: IdeApi }) {
  const openSample = (ext: string) => {
    const ws = ide.workspace;
    if (!ws) return;
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
    else ide.toast('Демо-файл не найден');
  };

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <CometLogo size={76} className="welcome-logo" />
        <h1 className="welcome-title">
          Comet <span>IDE</span>
        </h1>
        <p className="welcome-sub">
          Быстрая IDE на <b>Tauri 2</b> · <b>React</b> · <b>Monaco</b> — кометный курсор и 90+ языков
        </p>
        <div className="welcome-actions">
          <button className="btn primary" onClick={() => ide.openFolder()}>
            Открыть папку
          </button>
          <button className="btn" onClick={() => ide.setPalette({ mode: 'quick' })}>
            Быстрое открытие
          </button>
          <button
            className="btn"
            onClick={() => ide.requestCreate(ide.workspace?.rootPath ?? '/comet-playground', 'file')}
          >
            Новый файл
          </button>
        </div>
        <div className="welcome-shortcuts">
          <span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>P</kbd> Палитра</span>
          <span><kbd>Ctrl</kbd><kbd>P</kbd> Файл</span>
          <span><kbd>Ctrl</kbd><kbd>S</kbd> Сохранить</span>
          <span><kbd>Ctrl</kbd><kbd>B</kbd> Сайдбар</span>
        </div>
        <div className="welcome-langs">
          {CHIPS.map(([ext, label]) => (
            <button key={ext} className="lang-chip" onClick={() => openSample(ext)}>
              <span className="file-dot" style={{ background: EXT_COLORS[ext] || '#9aa7c4' }} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
