<script setup lang="ts">
import { store } from '../store';
import AppIcon from './AppIcon.vue';

const ITEMS: { id: 'explorer' | 'search' | 'source' | 'funo' | 'plugins' | 'languages' | 'settings'; key: string; icon: string }[] = [
  { id: 'explorer', key: 'activity.explorer', icon: 'files' },
  { id: 'search', key: 'activity.search', icon: 'search' },
  { id: 'source', key: 'activity.source', icon: 'git' },
  { id: 'funo', key: 'activity.funo', icon: 'funo' },
  { id: 'plugins', key: 'activity.plugins', icon: 'puzzle' },
  { id: 'languages', key: 'activity.languages', icon: 'languages' },
  { id: 'settings', key: 'activity.settings', icon: 'gear' },
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
      :title="store.t(it.key)"
      :aria-label="store.t(it.key)"
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
