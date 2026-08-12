<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { isTauri } from '../fs/bridge';
import AppIcon from './AppIcon.vue';

defineProps<{ activeFile: string | null }>();

const maximized = ref(false);
let unsub: (() => void) | undefined;

onMounted(async () => {
  if (!isTauri) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const w = getCurrentWindow();
    maximized.value = await w.isMaximized();
    unsub = await w.onResized(() => w.isMaximized().then((v) => (maximized.value = v)));
  } catch {
    /* ignore */
  }
});

const min = async () => (await import('@tauri-apps/api/window')).getCurrentWindow().minimize();
const max = async () => (await import('@tauri-apps/api/window')).getCurrentWindow().toggleMaximize();
const close = async () => (await import('@tauri-apps/api/window')).getCurrentWindow().close();
</script>

<template>
  <div class="titlebar" data-tauri-drag-region>
    <div class="titlebar-left" data-tauri-drag-region>
      <svg class="titlebar-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.5 19.5C8 16 10 12.5 13.5 8.5c2.3-2.6 4.6-3.6 6-3 1.2.5 1.5 2 .2 4.4-.8 1.5-2 3-3.3 4.4-3.4 3.6-7 5.2-11.9 5.2z"
          fill="#22d3ee"
          opacity="0.9"
        />
        <circle cx="17.6" cy="6.4" r="2.6" fill="#eafcff" />
      </svg>
      <span class="titlebar-name">TinyIDE</span>
      <span v-if="activeFile" class="titlebar-file">{{ activeFile }}</span>
    </div>
    <div class="titlebar-center" data-tauri-drag-region>
      <span v-if="!isTauri" class="web-badge">browser preview</span>
    </div>
    <div v-if="isTauri" class="titlebar-controls">
      <button class="win-btn" title="Свернуть" @click="min"><AppIcon name="minus" /></button>
      <button class="win-btn" title="Развернуть" @click="max">
        <AppIcon :name="maximized ? 'restore' : 'maximize'" />
      </button>
      <button class="win-btn win-btn-close" title="Закрыть" @click="close"><AppIcon name="close" /></button>
    </div>
  </div>
</template>
