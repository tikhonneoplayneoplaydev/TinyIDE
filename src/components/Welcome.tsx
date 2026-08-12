import type { FsNode, IdeApi } from '../types';
import { CometLogo } from './icons';
import { LangLogo } from '../languages/LangLogo';

const CHIPS: string[] = [
  'python', 'rust', 'go', 'typescript', 'javascript', 'java', 'cpp', 'c',
  'csharp', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'lua',
  'zig', 'haskell', 'elixir', 'clojure', 'sql', 'html', 'css', 'scss',
  'json', 'yaml', 'toml', 'markdown', 'shell', 'powershell', 'vue', 'svelte',
];

export default function Welcome({ ide }: { ide: IdeApi }) {
  const SAMPLE_EXT: Record<string, string> = {
    python: 'py', rust: 'rs', go: 'go', typescript: 'ts', javascript: 'js',
    java: 'java', cpp: 'cpp', c: 'c', csharp: 'cs', ruby: 'rb', php: 'php',
    swift: 'swift', kotlin: 'kt', scala: 'scala', dart: 'dart', lua: 'lua',
    zig: 'zig', haskell: 'hs', elixir: 'ex', clojure: 'clj', sql: 'sql',
    html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml',
    toml: 'toml', markdown: 'md', shell: 'sh', powershell: 'ps1',
    vue: 'vue', svelte: 'svelte',
  };

  const openSample = (lang: string) => {
    const ext = SAMPLE_EXT[lang];
    if (!ext) return;
    const ws = ide.workspace;
    if (!ws) {
      ide.toast('Сначала откройте пример проекта');
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
    else ide.toast('Пример не найден');
  };

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <CometLogo size={76} className="welcome-logo" />
        <h1 className="welcome-title">
          Tiny<span>IDE</span>
        </h1>
        <p className="welcome-sub">
          Быстрая IDE на <b>Tauri 2</b> · <b>React</b> · <b>Monaco</b> — кометный курсор и 90+ языков
        </p>
        <div className="welcome-actions">
          <button className="btn primary" onClick={() => ide.openFolder()}>
            Открыть папку
          </button>
          <button className="btn" onClick={() => ide.resetDemo()}>
            Открыть пример проекта
          </button>
          <button className="btn" onClick={() => ide.setPalette({ mode: 'quick' })}>
            Быстрое открытие
          </button>
        </div>
        <div className="welcome-shortcuts">
          <span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>P</kbd> Палитра</span>
          <span><kbd>Ctrl</kbd><kbd>P</kbd> Файл</span>
          <span><kbd>Ctrl</kbd><kbd>S</kbd> Сохранить</span>
          <span><kbd>Ctrl</kbd><kbd>B</kbd> Сайдбар</span>
        </div>
        <div className="welcome-langs">
          {CHIPS.map((lang) => (
            <button key={lang} className="lang-chip" onClick={() => openSample(lang)}>
              <LangLogo lang={lang} size={16} />
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
