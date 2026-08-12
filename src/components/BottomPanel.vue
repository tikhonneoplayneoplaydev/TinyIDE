<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { startTerminal, runTask } from '../terminal/bridge';
import type { TermHandle } from '../terminal/bridge';
import { store } from '../store';
import AppIcon from './AppIcon.vue';
import ShellSelector from './ShellSelector.vue';

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

// ─── Терминал ──────────────────────────────────────────────────────────────
const hostRef = ref<HTMLDivElement | null>(null);
const running = ref(false);
const restartKey = ref(0);
let term: Terminal | null = null;
let fit: FitAddon | null = null;
let handle: TermHandle | null = null;
let ro: ResizeObserver | null = null;
let disposed = false;

async function bootTerminal() {
  const host = hostRef.value;
  if (!host) return;
  handle?.kill();
  handle = null;
  term?.dispose();
  term = null;

  term = new Terminal({
    cursorBlink: true,
    fontSize: store.settings.terminalFontSize,
    fontFamily: store.settings.fontFamily,
    scrollback: 5000,
    theme: TERM_THEME,
  });
  fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  term.onData((d) => handle?.write(d));
  running.value = true;

  const cwd = store.workspace?.rootPath ?? '/';
  try {
    const h = await startTerminal(store.settings.shell, cwd, 80, 24);
    if (disposed) {
      h.kill();
      return;
    }
    h.onData((d) => {
      if (disposed || !term) return;
      try {
        term.write(d);
      } catch {
        /* ignore */
      }
    });
    h.onExit(() => {
      if (disposed || !term) return;
      try {
        term.write('\r\n\x1b[90m[процесс завершён]\x1b[0m\r\n');
      } catch {
        /* ignore */
      }
      running.value = false;
    });
    handle = h;
    requestAnimationFrame(() => {
      try {
        if (host.offsetWidth > 0 && host.offsetHeight > 0) {
          fit?.fit();
          h.resize(term!.cols, term!.rows);
        }
      } catch {
        /* ignore */
      }
    });
  } catch (e) {
    if (!disposed && term) {
      try {
        term.write(`\r\n\x1b[31mОшибка: ${String(e)}\x1b[0m\r\n`);
      } catch {
        /* ignore */
      }
    }
    running.value = false;
  }
}

onMounted(() => {
  disposed = false;
  bootTerminal();
  ro = new ResizeObserver(() => {
    try {
      if (hostRef.value && hostRef.value.offsetWidth > 0 && hostRef.value.offsetHeight > 0) {
        fit?.fit();
        handle?.resize(term!.cols, term!.rows);
      }
    } catch {
      /* ignore */
    }
  });
  if (hostRef.value) ro.observe(hostRef.value);
});

onUnmounted(() => {
  disposed = true;
  ro?.disconnect();
  handle?.kill();
  handle = null;
  term?.dispose();
  term = null;
});

watch(
  () => store.settings.shell,
  () => bootTerminal()
);
watch(
  () => store.settings.customShells.map((c) => c.name + ':' + c.command).join('|'),
  () => {
    // если выбранная оболочка — кастомная и её команда изменилась — перезапуск
    if (store.settings.shell.startsWith('custom:')) bootTerminal();
  }
);
watch(restartKey, () => bootTerminal());
watch(
  () => [store.settings.terminalFontSize, store.settings.fontFamily],
  () => {
    if (term) {
      term.options.fontSize = store.settings.terminalFontSize;
      term.options.fontFamily = store.settings.fontFamily;
    }
  }
);

// ─── Problems (маркеры Monaco) ─────────────────────────────────────────────
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type Marker = {
  path: string;
  line: number;
  col: number;
  severity: string;
  message: string;
};

const markers = ref<Marker[]>([]);

function collectMarkers() {
  const all = monaco.editor.getModelMarkers({});
  markers.value = all.map((m) => {
    const uri = m.uri.toString();
    const path = uri.startsWith('comet://') ? uri.slice('comet://'.length) : uri;
    return {
      path,
      line: m.startLineNumber,
      col: m.startColumn,
      severity: m.severity === monaco.MarkerSeverity.Error ? 'error' : m.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info',
      message: m.message,
    };
  });
}

const markerCounts = () => ({
  errors: markers.value.filter((m) => m.severity === 'error').length,
  warnings: markers.value.filter((m) => m.severity === 'warning').length,
});

function openMarker(m: Marker) {
  store.openFile(m.path);
  window.setTimeout(() => store.revealLine(m.path, m.line), 150);
}

// ─── Задачи ────────────────────────────────────────────────────────────────
const taskName = ref('build');
const output = ref('');
const taskRunning = ref(false);
const outEl = ref<HTMLDivElement | null>(null);

watch(
  () => Object.keys(store.taskCommands).join(','),
  () => {
    if (!Object.keys(store.taskCommands).includes(taskName.value) && Object.keys(store.taskCommands).length) {
      taskName.value = Object.keys(store.taskCommands)[0];
    }
  }
);

watch(
  () => store.taskRequest?.nonce,
  (n) => {
    if (n && store.taskRequest) {
      taskName.value = store.taskRequest.name;
      run(store.taskRequest.command);
    }
  }
);

watch(output, () => {
  outEl.value?.scrollTo({ top: outEl.value.scrollHeight });
});

async function run(command?: string) {
  const cmd = command ?? store.taskCommands[taskName.value];
  if (!cmd || taskRunning.value) return;
  taskRunning.value = true;
  output.value = '';
  const cwd = store.workspace?.rootPath ?? '/';
  const h = await runTask(cmd, cwd);
  h.onOutput((t) => (output.value += t));
  h.onExit((code) => {
    output.value += `\n\x1b[90m[задача завершена · код ${code}]\x1b[0m\n`;
    taskRunning.value = false;
  });
}

const styledLines = (line: string) =>
  line
    .replace(/\x1b\[90m/g, '<span class="tc-dim">')
    .replace(/\x1b\[31m/g, '<span class="tc-red">')
    .replace(/\x1b\[32m/g, '<span class="tc-green">')
    .replace(/\x1b\[36m/g, '<span class="tc-cyan">')
    .replace(/\x1b\[0m/g, '</span>');
</script>

<template>
  <div class="bottom-panel">
    <div class="bottom-tabs">
      <button class="bottom-tab" :class="{ active: store.panelTab === 'terminal' }" @click="store.setPanelTab('terminal')">Терминал</button>
      <button class="bottom-tab" :class="{ active: store.panelTab === 'tasks' }" @click="store.setPanelTab('tasks')">Задачи</button>
      <button class="bottom-tab" :class="{ active: store.panelTab === 'problems' }" @click="store.setPanelTab('problems'); collectMarkers()">
        Проблемы
        <span v-if="markers.length" class="problems-count" :class="{ err: markerCounts().errors > 0 }">
          {{ markerCounts().errors }}⚑ {{ markerCounts().warnings }}⚠
        </span>
      </button>
      <div class="bottom-tabs-spacer" />
      <button class="bottom-close" title="Закрыть панель (Ctrl+`)" @click="store.setPanelOpen(false)">
        <AppIcon name="close" :size="13" />
      </button>
    </div>

    <template v-if="store.panelTab === 'terminal'">
      <div class="bottom-toolbar">
        <ShellSelector :model-value="store.settings.shell" @update:model-value="(v) => store.updateSettings({ shell: v })" />
        <button class="btn-icon" title="Перезапустить терминал" @click="restartKey++">
          <AppIcon name="refresh" />
        </button>
        <span class="term-status">{{ running ? '● подключено' : '○ остановлено' }}</span>
        <div class="bottom-tabs-spacer" />
      </div>
      <div ref="hostRef" class="term-host" />
    </template>

    <template v-else-if="store.panelTab === 'problems'">
      <div class="problems-wrap">
        <div v-if="markers.length === 0" class="git-empty">Проблем нет — код чистый ✨</div>
        <div
          v-for="(m, i) in markers"
          :key="i"
          class="problem-row"
          :class="m.severity"
          @click="openMarker(m)"
        >
          <span class="problem-icon">{{ m.severity === 'error' ? '✕' : m.severity === 'warning' ? '⚠' : 'ℹ' }}</span>
          <span class="problem-path">{{ m.path }}:{{ m.line }}:{{ m.col }}</span>
          <span class="problem-msg">{{ m.message }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="tasks-wrap">
        <div class="bottom-toolbar">
          <button class="btn-icon primary" title="Запустить" :disabled="taskRunning" @click="run()">
            <AppIcon name="play" />
          </button>
          <select class="select shell-select" :value="taskName" title="Команда из секции [commands] в tinyide.toml" @change="(e) => (taskName = (e.target as HTMLSelectElement).value)">
            <option v-for="(cmd, n) in store.taskCommands" :key="n" :value="n">{{ n }}: {{ cmd }}</option>
          </select>
          <button class="btn-icon" title="Очистить вывод" @click="output = ''">
            <AppIcon name="trash" />
          </button>
          <div class="bottom-tabs-spacer" />
        </div>
        <div ref="outEl" class="task-output">
          <span v-if="output === '' && !taskRunning" class="task-hint">
            Выбери команду (build / run / test — из секции [commands] файла tinyide.toml) и нажми ▶
          </span>
          <div v-for="(line, i) in output.split('\n')" :key="i" v-html="styledLines(line) || '&nbsp;'" />
        </div>
      </div>
    </template>
  </div>
</template>
