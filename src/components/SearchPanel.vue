<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import type { FsNode } from '../types';
import { store } from '../store';
import { readFileText, listDirReal, SKIP_DIRS, isTauri } from '../fs/bridge';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from './AppIcon.vue';

type Result = { path: string; name: string; line: number; text: string };

const query = ref('');
const results = ref<Result[]>([]);
const searching = ref(false);
let timer: number | undefined;
let cancelled = false;

watch(query, async (qRaw) => {
  cancelled = true;
  const q = qRaw.trim().toLowerCase();
  const ws = store.workspace;
  results.value = [];
  if (!q || !ws) return;
  searching.value = true;
  cancelled = false;
  window.clearTimeout(timer);
  const myCancel = { flag: false };
  timer = window.setTimeout(async () => {
    // Tauri: параллельный поиск в Rust (tokio + rayon) — не блокирует UI
    if (isTauri && ws.mode === 'real') {
      try {
        const hits = (await invoke('search_files_parallel', {
          cwd: ws.rootPath,
          query: qRaw.trim(),
          showHidden: store.settings.showHidden,
        })) as Result[];
        results.value = hits;
        searching.value = false;
        return;
      } catch {
        /* fallback ниже */
      }
    }
    const out: Result[] = [];
    const readOne = async (path: string, name: string) => {
      if (myCancel.flag || out.length >= 300) return;
      try {
        const content = await readFileText(ws, path);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length && out.length < 300; i++) {
          if (lines[i].toLowerCase().includes(q)) {
            out.push({ path, name, line: i + 1, text: lines[i].trim().slice(0, 160) });
          }
        }
      } catch {
        /* unreadable */
      }
    };
    const walkVirtual = async (n: FsNode) => {
      if (myCancel.flag || out.length >= 300) return;
      if (n.kind === 'file') {
        if ((n.size ?? 0) > 512_000) return;
        await readOne(n.path, n.name);
      } else {
        for (const c of n.children ?? []) await walkVirtual(c);
      }
    };
    const walkReal = async (path: string) => {
      if (myCancel.flag || out.length >= 300) return;
      let entries;
      try {
        entries = await listDirReal(path);
      } catch {
        return;
      }
      for (const e of entries) {
        if (myCancel.flag || out.length >= 300) return;
        if (!store.settings.showHidden && e.name.startsWith('.')) continue;
        if (e.is_dir && SKIP_DIRS.has(e.name)) continue;
        if (e.is_dir) {
          await walkReal(e.path);
        } else {
          await readOne(e.path, e.name);
        }
      }
    };
    if (ws.mode === 'real') await walkReal(ws.rootPath);
    else await walkVirtual(ws.tree);
    if (!myCancel.flag) {
      results.value = out;
      searching.value = false;
    }
  }, 250);
});

onUnmounted(() => {
  cancelled = true;
  window.clearTimeout(timer);
});
</script>

<template>
  <div class="search-panel">
    <div class="panel-header"><span class="panel-title">Search</span></div>
    <div class="search-input-wrap">
      <AppIcon name="search" :size="14" />
      <input v-model="query" class="search-input" placeholder="Поиск по файлам…" autofocus />
    </div>
    <div v-if="query.trim()" class="search-summary">
      {{ searching ? 'Поиск…' : `${results.length} совпадений в ${new Set(results.map((r) => r.path)).size} файлах` }}
    </div>
    <div class="search-results">
      <div
        v-for="(r, i) in results"
        :key="i"
        class="search-result"
        :title="r.path"
        @click="store.revealLine(r.path, r.line)"
      >
        <span class="search-result-head">
          <span class="search-result-name">{{ r.name }}</span>
          <span class="search-result-line">:{{ r.line }}</span>
        </span>
        <span class="search-result-text">{{ r.text }}</span>
      </div>
      <div v-if="!searching && query.trim() && results.length === 0" class="search-empty">Ничего не найдено</div>
    </div>
  </div>
</template>
