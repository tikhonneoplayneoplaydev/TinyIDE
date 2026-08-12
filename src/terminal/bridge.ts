// ─── Terminal bridge: Tauri PTY ↔ web-симуляция ───────────────────────────

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../fs/bridge';
import { vfs } from '../fs/bridge';
import type { ShellId } from '../types';
import { store } from '../store';

export function getCustomShellCommand(name: string): string | undefined {
  return store.settings.customShells.find((c) => c.name === name)?.command;
}

export type TermHandle = {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(cb: (data: string) => void): void;
  onExit(cb: () => void): void;
};

export type TaskHandle = {
  onOutput(cb: (text: string) => void): void;
  onExit(cb: (code: number) => void): void;
};

// ─── Tauri (реальный PTY) ─────────────────────────────────────────────────

export async function startTerminal(
  shell: string,
  cwd: string,
  cols: number,
  rows: number
): Promise<TermHandle> {
  if (!isTauri) return startSimTerminal(shell as ShellId, cwd);

  // кастомная оболочка → передаём команду в Rust
  let command: string | undefined;
  if (shell.startsWith('custom:')) {
    const name = shell.slice('custom:'.length);
    command = getCustomShellCommand(name);
  }

  let outCb: ((d: string) => void) | null = null;
  let exitCb: (() => void) | null = null;

  const h: TermHandle = {
    write: () => {},
    resize: () => {},
    kill: () => {},
    onData: (cb) => {
      outCb = cb;
    },
    onExit: (cb) => {
      exitCb = cb;
    },
  };

  const id = await invoke<string>('pty_start', { shell, command, cwd, cols, rows });
  h.write = (data) => invoke('pty_write', { id, data }).catch(() => {});
  h.resize = (c, r) => invoke('pty_resize', { id, cols: c, rows: r }).catch(() => {});
  h.kill = () => invoke('pty_kill', { id }).catch(() => {});

  const unOut = await listen<string>(`pty-out:${id}`, (e) => {
    outCb?.(e.payload);
  });
  const unExit = await listen(`pty-exit:${id}`, () => {
    exitCb?.();
    unOut();
    unExit();
  });
  return h;
}

export async function runTask(command: string, cwd: string): Promise<TaskHandle> {
  if (!isTauri) return runTaskSim(command);

  let outCb: ((t: string) => void) | null = null;
  let exitCb: ((c: number) => void) | null = null;

  const h: TaskHandle = {
    onOutput: (cb) => {
      outCb = cb;
    },
    onExit: (cb) => {
      exitCb = cb;
    },
  };
  const unOut = await listen<[string, string]>('task:out', (e) => {
    outCb?.(e.payload[1]);
  });
  const unExit = await listen<[string, number]>('task:exit', (e) => {
    exitCb?.(e.payload[1]);
    unOut();
    unExit();
  });
  await invoke('run_task', { command, cwd }).catch(() => {
    outCb?.('\x1b[31mОшибка запуска задачи\x1b[0m\n');
    exitCb?.(-1);
  });
  return h;
}

export type GitInfo = { branch: string | null; files: { path: string; status: string }[] };

export async function gitStatus(cwd: string): Promise<GitInfo> {
  if (!isTauri) throw new Error('Git-панель доступна в десктоп-версии (Tauri)');
  return invoke<GitInfo>('git_status', { cwd });
}

// ─── Веб-симуляция оболочки ───────────────────────────────────────────────

const PROMPTS: Record<string, string> = {
  nu: '❯ ',
  pwsh: 'PS ❯ ',
  cmd: 'C:\\> ',
  zsh: '% ',
  fish: '~> ',
  shell: '$ ',
};

const TINY_LOGO = [
  '      ___              ',
  '  ___/ _ \\__  __       ',
  ' / _ \\/\\_\\/ / / /  v0.4',
  '/_/\\_\\____/_/ /_/      ',
].join('\r\n');

function startSimTerminal(shell: string, cwd: string): TermHandle {
  let outCb: (d: string) => void = () => {};
  let exitCb: () => void = () => {};
  let input = '';
  let exited = false;

  // промпт для кастомных оболочек
  const promptStr = shell.startsWith('custom:')
    ? shell.slice('custom:'.length) + '> '
    : PROMPTS[shell] ?? '$ ';

  const h: TermHandle = {
    write: () => {},
    resize: () => {},
    kill: () => {
      exited = true;
      exitCb();
    },
    onData: (cb) => (outCb = cb),
    onExit: (cb) => (exitCb = cb),
  };

  const emit = (text: string) => outCb(text);

  const print = (text: string) => emit(text + '\r\n');

  const prompt = () => emit(`\x1b[36m${promptStr}\x1b[0m`);

  const exec = (line: string) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    switch (cmd) {
      case 'help':
        print('\x1b[33mДоступные команды (веб-демо):\x1b[0m help, ls, pwd, echo, date, whoami, clear, tinyide, exit');
        break;
      case 'clear':
        emit('\x1b[2J\x1b[H');
        break;
      case 'ls': {
        const names = vfs.getTree().children?.map((c) => c.name).join('  ') || '(пусто)';
        print(names);
        break;
      }
      case 'pwd':
        print(cwd);
        break;
      case 'echo':
        print(args.join(' '));
        break;
      case 'date':
        print(new Date().toString());
        break;
      case 'whoami':
        print('user@tinyide');
        break;
      case 'tinyide':
        print(`\x1b[36m${TINY_LOGO}\x1b[0m`);
        print('\x1b[90mTinyIDE — терминал в веб-демо. Полный PTY доступен в десктоп-версии.\x1b[0m');
        break;
      case 'exit':
        print('exit');
        exited = true;
        exitCb();
        break;
      case '':
        break;
      default:
        print(`\x1b[31mКоманда не найдена:\x1b[0m ${cmd} (наберите help)`);
    }
  };

  h.write = (data) => {
    if (exited) return;
    for (const ch of data) {
      if (ch === '\r' || ch === '\n') {
        emit('\r\n');
        exec(input);
        input = '';
        if (!exited) prompt();
      } else if (ch === '\x7f' || ch === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          emit('\b \b');
        }
      } else if (ch === '\x03') {
        emit('^C\r\n');
        input = '';
        prompt();
      } else if (ch >= ' ' && ch !== '\x1b') {
        input += ch;
        emit(ch);
      }
    }
  };

  // приветствие
  setTimeout(() => {
    emit('\x1b[36mTinyIDE терминал (веб-демо)\x1b[0m — оболочка: ');
    emit(`\x1b[33m${shell}\x1b[0m\r\n`);
    print('Полноценный PTY (nu, pwsh, cmd, zsh, fish) — в десктоп-версии.');
    prompt();
  }, 60);

  return h;
}

function runTaskSim(command: string): TaskHandle {
  let outCb: ((t: string) => void) | null = null;
  let exitCb: ((c: number) => void) | null = null;
  const h: TaskHandle = {
    onOutput: (cb) => {
      outCb = cb;
    },
    onExit: (cb) => {
      exitCb = cb;
    },
  };
  setTimeout(() => {
    outCb?.(`\x1b[36m$ ${command}\x1b[0m\r\n`);
    outCb?.('\x1b[90m[веб-демо] Задачи выполняются только в десктоп-версии.\x1b[0m\r\n');
    outCb?.('\x1b[32m[веб-демо] (имитация) задача завершена ✔\x1b[0m\r\n');
    exitCb?.(0);
  }, 500);
  return h;
}
