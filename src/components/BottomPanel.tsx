import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { startTerminal, runTask } from '../terminal/bridge';
import type { TermHandle } from '../terminal/bridge';
import { SHELLS } from '../types';
import type { IdeApi } from '../types';
import { CloseIcon, PlayIcon, RefreshIcon, TrashIcon } from './icons';

const TERM_THEME = {
  background: '#0b0e17',
  foreground: '#d5e0f7',
  cursor: '#67e8f9',
  cursorAccent: '#0b0e17',
  selectionBackground: '#2a4d7a66',
  black: '#0b0e17',
  brightBlack: '#5b6a8c',
  red: '#f87171',
  brightRed: '#f87171',
  green: '#34d399',
  brightGreen: '#34d399',
  yellow: '#fbbf24',
  brightYellow: '#fbbf24',
  blue: '#7aa2ff',
  brightBlue: '#7aa2ff',
  magenta: '#f472b6',
  brightMagenta: '#f472b6',
  cyan: '#22d3ee',
  brightCyan: '#22d3ee',
  white: '#d5e0f7',
  brightWhite: '#ffffff',
};

// ─── Нижняя панель: Терминал | Задачи ─────────────────────────────────────

export default function BottomPanel({ ide }: { ide: IdeApi }) {
  return (
    <div className="bottom-panel">
      <div className="bottom-tabs">
        <button
          className={`bottom-tab ${ide.panelTab === 'terminal' ? 'active' : ''}`}
          onClick={() => ide.setPanelTab('terminal')}
        >
          Терминал
        </button>
        <button
          className={`bottom-tab ${ide.panelTab === 'tasks' ? 'active' : ''}`}
          onClick={() => ide.setPanelTab('tasks')}
        >
          Задачи
        </button>
        <div className="bottom-tabs-spacer" />
        <button
          className="bottom-close"
          title="Закрыть панель (Ctrl+`)"
          onClick={() => ide.setPanelOpen(false)}
        >
          <CloseIcon size={13} />
        </button>
      </div>
      {ide.panelTab === 'terminal' ? <TerminalTab ide={ide} /> : <TasksTab ide={ide} />}
    </div>
  );
}

// ─── Терминал ─────────────────────────────────────────────────────────────

function TerminalTab({ ide }: { ide: IdeApi }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const handleRef = useRef<TermHandle | null>(null);
  const [running, setRunning] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const shell = ide.settings.shell;

  // создаём терминал заново при смене оболочки или перезапуске
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    handleRef.current?.kill();
    handleRef.current = null;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: ide.settings.terminalFontSize,
      fontFamily: ide.settings.fontFamily,
      scrollback: 5000,
      theme: TERM_THEME,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    term.onData((d) => handleRef.current?.write(d));
    termRef.current = term;
    setRunning(true);

    const cwd = ide.workspace?.rootPath ?? '/';
    startTerminal(shell, cwd, 80, 24)
      .then((h) => {
        if (disposed) {
          h.kill();
          return;
        }
        h.onData((d) => {
          if (disposed) return;
          try {
            term.write(d);
          } catch {
            /* ignore */
          }
        });
        h.onExit(() => {
          if (disposed) return;
          try {
            term.write('\r\n\x1b[90m[процесс завершён]\x1b[0m\r\n');
          } catch {
            /* ignore */
          }
          setRunning(false);
        });
        handleRef.current = h;
        requestAnimationFrame(() => {
          try {
            if (host.offsetWidth > 0 && host.offsetHeight > 0) {
              fit.fit();
              h.resize(term.cols, term.rows);
            }
          } catch {
            /* ignore */
          }
        });
      })
      .catch((e) => {
        if (disposed) return;
        try {
          term.write(`\r\n\x1b[31mОшибка: ${String(e)}\x1b[0m\r\n`);
        } catch {
          /* ignore */
        }
        setRunning(false);
      });

    const ro = new ResizeObserver(() => {
      try {
        if (host.offsetWidth > 0 && host.offsetHeight > 0) {
          fit.fit();
          handleRef.current?.resize(term.cols, term.rows);
        }
      } catch {
        /* ignore */
      }
    });
    ro.observe(host);

    return () => {
      disposed = true;
      ro.disconnect();
      handleRef.current?.kill();
      handleRef.current = null;
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell, restartKey]);

  // подстройка размера шрифта без пересоздания
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = ide.settings.terminalFontSize;
      termRef.current.options.fontFamily = ide.settings.fontFamily;
    }
  }, [ide.settings.terminalFontSize, ide.settings.fontFamily]);

  return (
    <>
      <div className="bottom-toolbar">
        <select
          className="select shell-select"
          value={shell}
          title="Выбрать оболочку (перезапустит терминал)"
          onChange={(e) => ide.updateSettings({ shell: e.target.value as never })}
        >
          {SHELLS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn-icon" title="Перезапустить терминал" onClick={() => setRestartKey((k) => k + 1)}>
          <RefreshIcon />
        </button>
        <span className="term-status">{running ? '● подключено' : '○ остановлено'}</span>
        <div className="bottom-tabs-spacer" />
      </div>
      <div className="term-host" ref={hostRef} />
    </>
  );
}

// ─── Задачи (команды из tinyide.toml) ─────────────────────────────────────

function TasksTab({ ide }: { ide: IdeApi }) {
  const [name, setName] = useState('build');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const outRef = useRef<HTMLDivElement | null>(null);
  const names = Object.keys(ide.taskCommands);

  useEffect(() => {
    if (!names.includes(name) && names.length) setName(names[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join(',')]);

  useEffect(() => {
    if (ide.taskRequest) {
      setName(ide.taskRequest.name);
      run(ide.taskRequest.command);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ide.taskRequest?.nonce]);

  const run = async (command?: string) => {
    const cmd = command ?? ide.taskCommands[name];
    if (!cmd || running) return;
    setRunning(true);
    setOutput('');
    const cwd = ide.workspace?.rootPath ?? '/';
    const h = await runTask(cmd, cwd);
    h.onOutput((t) => setOutput((o) => o + t));
    h.onExit((code) => {
      setOutput((o) => o + `\n\x1b[90m[задача завершена · код ${code}]\x1b[0m\n`);
      setRunning(false);
    });
  };

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [output]);

  return (
    <div className="tasks-wrap">
      <div className="bottom-toolbar">
        <button
          className="btn-icon primary"
          title="Запустить"
          onClick={() => run()}
          disabled={running}
        >
          <PlayIcon />
        </button>
        <select
          className="select shell-select"
          value={name}
          onChange={(e) => setName(e.target.value)}
          title="Команда из секции [commands] в tinyide.toml"
        >
          {names.map((n) => (
            <option key={n} value={n}>
              {n}: {ide.taskCommands[n]}
            </option>
          ))}
        </select>
        <button className="btn-icon" title="Очистить вывод" onClick={() => setOutput('')}>
          <TrashIcon />
        </button>
        <div className="bottom-tabs-spacer" />
      </div>
      <div className="task-output" ref={outRef}>
        {output === '' && !running && (
          <span className="task-hint">
            Выбери команду (build / run / test — из секции [commands] файла tinyide.toml) и нажми ▶
          </span>
        )}
        {output.split('\n').map((line, i) => {
          const styled = line
            .replace(/\x1b\[90m/g, '<span class="tc-dim">')
            .replace(/\x1b\[31m/g, '<span class="tc-red">')
            .replace(/\x1b\[32m/g, '<span class="tc-green">')
            .replace(/\x1b\[36m/g, '<span class="tc-cyan">')
            .replace(/\x1b\[0m/g, '</span>');
          return <div key={i} dangerouslySetInnerHTML={{ __html: styled || '&nbsp;' }} />;
        })}
      </div>
    </div>
  );
}
