<script setup lang="ts">
import { store } from '../store';
import AppIcon from './AppIcon.vue';

const ITEMS: { id: 'explorer' | 'search' | 'source' | 'funo' | 'plugins' | 'languages' | 'settings'; label: string; icon: string }[] = [
  { id: 'explorer', label: 'Explorer', icon: 'files' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'source', label: 'Source Control', icon: 'git' },
  { id: 'funo', label: 'Funo — компилятор', icon: 'funo' },
  { id: 'plugins', label: 'Plugins (WASM)', icon: 'puzzle' },
  { id: 'languages', label: 'Languages', icon: 'languages' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];

const click = (id: (typeof ITEMS)[number]['id']) => {
  if (store.activity === id && store.sidebarOpen) {
    store.setSidebarOpen(false);
  } else {
    store.setActivity(id);
    store.setSidebarOpen(true);
  }
};
</script>

<template>
  <div class="activitybar">
    <button
      v-for="it in ITEMS"
      :key="it.id"
      class="activity-btn"
      :class="{ active: store.activity === it.id }"
      :title="it.label"
      :aria-label="it.label"
      @click="click(it.id)"
    >
      <AppIcon :name="it.icon" :size="22" />
    </button>
    <div class="activitybar-spacer" />
    <div class="activitybar-bottom">
      <button class="activity-btn" title="GitHub" @click="store.toast('Исходники: github.com/tikhonneoplayneoplaydev/TinyIDE')">
        <AppIcon name="github" :size="20" />
      </button>
    </div>
  </div>
</template>
