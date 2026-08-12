<script setup lang="ts">
import { computed, ref } from 'vue';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { FsNode } from '../types';
import { store } from '../store';
import LangLogo from '../languages/LangLogo.vue';
import AppIcon from './AppIcon.vue';

const POPULAR = new Set([
  'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'csharp',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'lua', 'zig', 'haskell', 'elixir',
  'clojure', 'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'shell', 'vue', 'svelte',
  'funo',
]);

const q = ref('');
const langs = computed(() =>
  monaco.languages.getLanguages().filter((l) => l.id && !l.id.startsWith('_')).sort((a, b) => a.id.localeCompare(b.id))
);

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  if (!query) return langs.value;
  return langs.value.filter(
    (l) =>
      l.id.toLowerCase().includes(query) ||
      (l.aliases ?? []).some((a) => a.toLowerCase().includes(query))
  );
});

function openSample(langId: string) {
  const ws = store.workspace;
  if (!ws) {
    store.toast('Сначала откройте пример проекта');
    return;
  }
  const lang = langs.value.find((l) => l.id === langId);
  const ext = lang?.extensions?.[0]?.replace('.', '');
  if (!ext) {
    store.toast(langId + ' — язык поддерживается, демо-файла нет');
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
  else store.toast(langId + ' — язык поддерживается, демо-файла нет');
}
</script>

<template>
  <div class="lang-panel">
    <div class="panel-header">
      <span class="panel-title">Languages</span>
      <span class="panel-count">{{ langs.length }}</span>
    </div>
    <div class="search-input-wrap">
      <AppIcon name="search" :size="14" />
      <input v-model="q" class="search-input" placeholder="Найти язык…" />
    </div>
    <div class="lang-list">
      <button v-for="l in filtered" :key="l.id" class="lang-row" :title="l.id" @click="openSample(l.id)">
        <LangLogo :lang="l.id" :size="18" />
        <span class="lang-name">{{ l.id }}</span>
        <span v-if="POPULAR.has(l.id)" class="lang-pop">популярный</span>
        <span v-if="l.extensions?.[0]" class="lang-ext">{{ l.extensions[0] }}</span>
      </button>
    </div>
  </div>
</template>
