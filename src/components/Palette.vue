<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { store, commands } from '../store';
import type { CommandDef } from '../types';
import AppIcon from './AppIcon.vue';

const query = ref('');
const idx = ref(0);
const listEl = ref<HTMLDivElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);

const quick = computed(() => store.palette?.mode === 'quick');

const rows = computed(() => {
  if (quick.value) {
    return store.treeFiles().map((f) => ({
      key: f.path,
      label: f.name,
      hint: f.path,
      run: () => store.openFile(f.path),
    }));
  }
  return commands.value.map((c: CommandDef) => ({
    key: c.id,
    label: c.label,
    hint: c.key,
    run: c.run,
  }));
});

function fuzzyScore(q: string, s: string): number {
  q = q.toLowerCase();
  s = s.toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  let last = -2;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) {
      score += 1 + (i === last + 1 ? streak * 0.6 : 0) + (i === 0 || s[i - 1] === ' ' || s[i - 1] === '/' ? 2 : 0);
      streak++;
      last = i;
      qi++;
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score : -1;
}

const filtered = computed(() => {
  const scored = rows.value
    .map((r) => ({ r, s: fuzzyScore(query.value, r.label) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, 14).map((x) => x.r);
});

onMounted(() => {
  inputEl.value?.focus();
});

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    store.setPalette(null);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    idx.value = Math.min(idx.value + 1, filtered.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    idx.value = Math.max(idx.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const r = filtered.value[idx.value];
    if (r) run(r);
  }
}

function run(r: (typeof rows.value)[number]) {
  store.setPalette(null);
  r.run();
}

function onHover(i: number) {
  idx.value = i;
}
</script>

<template>
  <div class="palette-overlay" @mousedown="store.setPalette(null)">
    <div class="palette" @mousedown.stop>
      <input
        ref="inputEl"
        v-model="query"
        :placeholder="quick ? store.t('palette.filePlaceholder') : store.t('palette.cmdPlaceholder')"
        @keydown="onKey"
        @input="idx = 0"
      />
      <div class="palette-list" ref="listEl">
        <div v-if="filtered.length === 0" class="palette-empty">{{ store.t('palette.empty') }}</div>
        <div
          v-for="(r, i) in filtered"
          :key="r.key"
          class="palette-item"
          :class="{ hl: i === idx }"
          @mouseenter="onHover(i)"
          @click="run(r)"
        >
          <span class="palette-label">
            <AppIcon v-if="quick" name="file" class="palette-file-icon" :size="13" />
            {{ r.label }}
          </span>
          <span v-if="r.hint" class="palette-hint">{{ r.hint }}</span>
        </div>
      </div>
      <div class="palette-footer">
        <span>↑↓ — {{ store.t('palette.nav') }}</span>
        <span>↵ — {{ store.t('palette.run') }}</span>
        <span>Esc — {{ store.t('palette.close') }}</span>
      </div>
    </div>
  </div>
</template>
