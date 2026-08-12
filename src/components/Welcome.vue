<script setup lang="ts">
import type { FsNode } from '../types';
import { store } from '../store';
import LangLogo from '../languages/LangLogo.vue';

const SAMPLE_EXT: Record<string, string> = {
  python: 'py', rust: 'rs', go: 'go', typescript: 'ts', javascript: 'js',
  java: 'java', cpp: 'cpp', c: 'c', csharp: 'cs', ruby: 'rb', php: 'php',
  swift: 'swift', kotlin: 'kt', scala: 'scala', dart: 'dart', lua: 'lua',
  zig: 'zig', haskell: 'hs', elixir: 'ex', clojure: 'clj', sql: 'sql',
  html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml',
  toml: 'toml', markdown: 'md', shell: 'sh', powershell: 'ps1',
  vue: 'vue', svelte: 'svelte', funo: 'fun',
};

const CHIPS = [
  'python', 'rust', 'go', 'typescript', 'javascript', 'java', 'cpp', 'c',
  'csharp', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'lua',
  'zig', 'haskell', 'elixir', 'clojure', 'sql', 'html', 'css', 'scss',
  'json', 'yaml', 'toml', 'markdown', 'shell', 'powershell', 'vue', 'svelte',
  'funo',
];

function openSample(lang: string) {
  const ext = SAMPLE_EXT[lang];
  if (!ext) return;
  const ws = store.workspace;
  if (!ws) {
    store.toast(store.t('toast.noWorkspace'));
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
  if (p) store.openFile(p);
  else store.toast('Example not found');
}
</script>

<template>
  <div class="welcome">
    <div class="welcome-inner">
      <svg class="welcome-logo" width="76" height="76" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="welcomeGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="55%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#f472b6" />
          </linearGradient>
        </defs>
        <path d="M4.5 19.5C8 16 10 12.5 13.5 8.5c2.3-2.6 4.6-3.6 6-3 1.2.5 1.5 2 .2 4.4-.8 1.5-2 3-3.3 4.4-3.4 3.6-7 5.2-11.9 5.2z" fill="url(#welcomeGrad)" opacity="0.9" />
        <circle cx="17.6" cy="6.4" r="2.6" fill="#eafcff" />
      </svg>
      <h1 class="welcome-title">Tiny<span>IDE</span></h1>
      <p class="welcome-sub">{{ store.t('welcome.subtitle') }}</p>
      <div class="welcome-actions">
        <button class="btn primary" @click="store.openFolder()">{{ store.t('welcome.openFolder') }}</button>
        <button class="btn" @click="store.openExample()">{{ store.t('welcome.openExample') }}</button>
        <button class="btn" @click="store.setPalette({ mode: 'quick' })">{{ store.t('welcome.quickOpen') }}</button>
      </div>
      <div class="welcome-shortcuts">
        <span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>P</kbd> {{ store.t('welcome.palette') }}</span>
        <span><kbd>Ctrl</kbd><kbd>P</kbd> {{ store.t('welcome.file') }}</span>
        <span><kbd>Ctrl</kbd><kbd>S</kbd> {{ store.t('welcome.save') }}</span>
        <span><kbd>Ctrl</kbd><kbd>B</kbd> {{ store.t('welcome.sidebar') }}</span>
        <span><kbd>Ctrl</kbd><kbd>`</kbd> {{ store.t('welcome.terminal') }}</span>
      </div>
      <div class="welcome-langs">
        <button v-for="lang in CHIPS" :key="lang" class="lang-chip" @click="openSample(lang)">
          <LangLogo :lang="lang" :size="16" />
          {{ lang }}
        </button>
      </div>
    </div>
  </div>
</template>
