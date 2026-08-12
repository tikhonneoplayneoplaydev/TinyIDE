<script setup lang="ts">
import { store } from '../store';
import LangLogo from '../languages/LangLogo.vue';
import AppIcon from './AppIcon.vue';

const closeTab = (e: MouseEvent, path: string) => {
  e.stopPropagation();
  store.closeTab(path);
};
const midClick = (e: MouseEvent, path: string) => {
  if (e.button === 1) store.closeTab(path);
};
</script>

<template>
  <div class="tabs">
    <div v-if="store.openFiles.length === 0" class="tabs-empty" />
    <div
      v-for="f in store.openFiles"
      :key="f.path"
      class="tab"
      :class="{ active: f.path === store.activePath }"
      :title="f.path"
      @click="store.setActivePath(f.path)"
      @auxclick="midClick($event, f.path)"
    >
      <LangLogo :lang="f.language" :size="14" />
      <span class="tab-name">{{ f.name }}</span>
      <span v-if="store.dirty[f.path]" class="tab-dirty" title="Не сохранено" />
      <button
        v-else
        class="tab-close"
        title="Закрыть (Ctrl+W)"
        @click="closeTab($event, f.path)"
      >
        <AppIcon name="close" :size="12" />
      </button>
    </div>
  </div>
</template>
