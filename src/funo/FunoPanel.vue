<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FsNode } from '../types';
import { store } from '../store';
import { isTauri } from '../fs/bridge';
import LangLogo from '../languages/LangLogo.vue';
import AppIcon from '../components/AppIcon.vue';
import {
  getFunoSource, funoCheck, funoTranspile, funoCompile, funoCheckWeb, funoTranspileWeb,
} from './bridge';
import { pluginDiagnose, pluginTranspile } from '../plugins/manager';
import { callPlugin } from '../plugins/bridge';
import type { FunoBuildResult, FunoDiagnostic, FunoTranspileResult } from './bridge';

const busy = ref(false);
const output = ref('');
const lastDiags = ref<FunoDiagnostic[]>([]);

const funFiles = computed<{ path: string; name: string }[]>(() => {
  const ws = store.workspace;
  if (!ws) return [];
  const out: { path: string; name: string }[] = [];
  const walk = (n: FsNode) => {
    if (n.kind === 'file') {
      if (n.name.endsWith('.fun')) out.push({ path: n.path, name: n.name });
    } else n.children?.forEach(walk);
  };
  walk(ws.tree);
  return out;
});

const selected = computed(() => {
  const p = store.activePath;
  if (p && p.endsWith('.fun')) return p;
  return funFiles.value[0]?.path ?? null;
});

function fmtDiags(diags: FunoDiagnostic[]): string {
  if (!diags.length) return store.t('funo.ok');
  return diags
    .map((d) => `\x1b[31m[${d.severity}] ${d.title}\x1b[0m ${d.line}:${d.column} — ${d.message}`)
    .join('\n');
}

async function withSource(fn: (src: string, path: string) => Promise<string>) {
  if (!selected.value) {
    store.toast(store.t('funo.noFun'));
    return;
  }
  busy.value = true;
  output.value = '';
  try {
    const src = await getFunoSource(selected.value);
    output.value = await fn(src, selected.value);
  } catch (e) {
    output.value = `\x1b[31mОшибка: ${String(e)}\x1b[0m`;
  } finally {
    busy.value = false;
  }
}

async function doCheck() {
  await withSource(async (src, path) => {
    let diags: FunoDiagnostic[];
    if (isTauri) diags = await funoCheck(src);
    else {
      try {
        diags = (await pluginDiagnose('funo', 'funo', src)) as FunoDiagnostic[];
      } catch {
        diags = funoCheckWeb(src);
      }
    }
    lastDiags.value = diags;
    // маркеры в Monaco
    const { setMarkers } = await import('./funoMarkers');
    setMarkers(path, diags);
    return fmtDiags(diags);
  });
}

async function doTranspile() {
  await withSource(async (src) => {
    let res: FunoTranspileResult;
    if (isTauri) res = await funoTranspile(src);
    else {
      try {
        res = (await pluginTranspile('funo', 'funo', src)) as FunoTranspileResult;
      } catch {
        res = funoTranspileWeb(src);
      }
    }
    if (res.ok) {
      return `\x1b[32m✓ Funo → Java OK\x1b[0m\n\n${res.java}`;
    }
    return fmtDiags(res.errors ?? []);
  });
}

async function doCompile() {
  await withSource(async (src) => {
    const root = store.workspace?.rootPath ?? '/';
    const r: FunoBuildResult = await funoCompile(src, root, false);
    const lines = [
      r.success ? '\x1b[32m✓ Компиляция успешна\x1b[0m' : '\x1b[31m✗ Компиляция не удалась\x1b[0m',
      `⏱ ${r.elapsed_ms} мс`,
      '',
      r.stdout,
      r.stderr,
      r.diagnostics.length ? fmtDiags(r.diagnostics) : '',
      r.artifact ? `\n📦 Артефакт: ${r.artifact}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  });
}

async function doRun() {
  await withSource(async (src) => {
    const root = store.workspace?.rootPath ?? '/';
    const r: FunoBuildResult = await funoCompile(src, root, true);
    return [
      r.success ? '\x1b[32m✓ Запуск завершён\x1b[0m' : '\x1b[31m✗ Запуск не удался\x1b[0m',
      `⏱ ${r.elapsed_ms} мс`,
      '',
      '── stdout ──',
      r.stdout,
      '── stderr ──',
      r.stderr,
    ].join('\n');
  });
}

const styled = (line: string) =>
  line
    .replace(/\x1b\[90m/g, '<span class="tc-dim">')
    .replace(/\x1b\[31m/g, '<span class="tc-red">')
    .replace(/\x1b\[32m/g, '<span class="tc-green">')
    .replace(/\x1b\[36m/g, '<span class="tc-cyan">')
    .replace(/\x1b\[0m/g, '</span>');
</script>

<template>
  <div class="funo-panel">
    <div class="panel-header">
      <span class="panel-title">{{ store.t('funo.title') }}</span>
      <span class="panel-count">.fun</span>
    </div>

    <div class="funo-intro">
      <b>Funo</b> — {{ store.t('funo.intro').replace('Funo — ', '') }}
    </div>

    <div class="funo-files">
      <div v-if="funFiles.length === 0" class="funo-empty">{{ store.t('funo.noFiles') }}</div>
      <div
        v-for="f in funFiles"
        :key="f.path"
        class="funo-file"
        :class="{ active: f.path === selected }"
        @click="store.openFile(f.path)"
      >
        <LangLogo lang="funo" :size="15" />
        <span class="funo-file-name">{{ f.name }}</span>
      </div>
    </div>

    <div class="funo-actions">
      <button class="btn funo-btn" :disabled="busy || !selected" @click="doCheck">
        <AppIcon name="check" :size="13" /> Проверить
      </button>
      <button class="btn funo-btn" :disabled="busy || !selected" @click="doTranspile">
        <AppIcon name="sync" :size="13" /> В Java
      </button>
      <button class="btn funo-btn" :disabled="busy || !selected" @click="doCompile">
        <AppIcon name="file" :size="13" /> Собрать .jar
      </button>
      <button class="btn funo-btn primary" :disabled="busy || !selected" @click="doRun">
        <AppIcon name="play" :size="13" /> Запустить
      </button>
    </div>

    <div v-if="!isTauri" class="funo-webnote">
      {{ store.t('funo.webNote') }}
    </div>

    <div class="funo-output">
      <template v-if="output === ''">
        <span class="task-hint">{{ store.t('funo.hint') }}</span>
      </template>
      <template v-else>
        <div v-for="(line, i) in output.split('\n')" :key="i" v-html="styled(line) || '&nbsp;'" />
      </template>
    </div>
  </div>
</template>
