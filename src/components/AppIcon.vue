<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ name: string; size?: number; className?: string }>(), {
  size: 16,
  className: '',
});

// внутренности SVG (path и т.п.) по имени иконки
const ICONS: Record<string, { viewBox?: string; fill?: boolean; body: string }> = {
  files: { body: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>' },
  search: { body: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' },
  languages: { body: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z"/>' },
  gear: { body: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>' },
  chevron: { body: '<path d="m9 6 6 6-6 6"/>' },
  close: { body: '<path d="M6 6l12 12M18 6L6 18"/>' },
  minus: { body: '<path d="M5 12h14"/>' },
  maximize: { body: '<rect x="5" y="5" width="14" height="14" rx="2"/>' },
  restore: { body: '<rect x="5" y="9" width="10" height="10" rx="2"/><path d="M9 5h10v10"/>' },
  branch: { body: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 4-4 3.5-6 4"/>' },
  sync: { body: '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>' },
  check: { body: '<path d="m5 13 4.5 4.5L19 7"/>' },
  warn: { body: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v5"/><path d="M12 17.5v.5"/>' },
  sun: { body: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19"/>' },
  moon: { body: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>' },
  comet: { fill: true, body: '<path d="M4 20c3.6-2.6 5.4-5.6 8-9 2.4-3 4.6-3.8 6-3.2 1.2.5 1.4 2 .2 4.3-.8 1.5-2 3-3.3 4.3C12.6 19 8.6 20 4 20z" opacity=".85"/><circle cx="17.5" cy="7" r="2.4"/>' },
  folder: { body: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>' },
  folderOpen: { body: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill-opacity="0.25"/><path d="M3 11h18"/>' },
  plus: { body: '<path d="M12 5v14M5 12h14"/>' },
  refresh: { body: '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>' },
  file: { body: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>' },
  trash: { body: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/>' },
  terminal: { body: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m7 9.5 3 2.7-3 2.7M12.5 15h4.5"/>' },
  play: { fill: true, body: '<path d="M7 4.5v15a1 1 0 0 0 1.5.87l12.5-7.5a1 1 0 0 0 0-1.74L8.5 3.63A1 1 0 0 0 7 4.5z"/>' },
  git: { body: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><circle cx="18" cy="7" r="2.6"/><path d="M6 8.6v6.8M18 9.6c0 4.4-4.4 3.6-7 4.4"/>' },
  github: { fill: true, body: '<path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.4 4.7 18.4 5 18.4 5c.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/>' },
  funo: { body: '<circle cx="12" cy="12" r="9"/><path d="M12 5l7 7-7 7-7-7z" fill="currentColor" stroke="none"/>' },
  palette: { body: '<path d="M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-1.5 3.3c.4.5.3 1.4-.5 1.9-.6.4-1.3.8-2 .8z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="11" r="1" fill="currentColor" stroke="none"/>' },
  down: { body: '<path d="m6 9 6 6 6-6"/>' },
};

const svg = computed(() => {
  const def = ICONS[props.name] ?? ICONS.file;
  return {
    viewBox: def.viewBox ?? '0 0 24 24',
    fill: def.fill ? 'currentColor' : 'none',
    body: def.body,
  };
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="svg.fill"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="className"
    aria-hidden="true"
    v-html="svg.body"
  />
</template>
