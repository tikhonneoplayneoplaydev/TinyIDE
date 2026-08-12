<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { store, cursorEmitter } from '../store';
import AppIcon from './AppIcon.vue';

const cursor = { line: 1, col: 1 };
let unsub: (() => void) | undefined;

onMounted(() => {
  unsub = cursorEmitter.subscribe((c) => {
    cursor.line = c.line;
    cursor.col = c.col;
  });
});
onUnmounted(() => unsub?.());

const dirtyCount = () => Object.values(store.dirty).filter(Boolean).length;
const active = () => store.openFiles.find((f) => f.path === store.activePath);
</script>

<template>
  <div class="statusbar">
    <div class="status-left">
      <span class="status-item" :title="store.t('status.main')"><AppIcon name="branch" :size="13" /> {{ store.t('status.main') }}</span>
      <span class="status-item" title="sync"><AppIcon name="sync" :size="13" /> 0↓ 0↑</span>
      <span class="status-item" :title="store.t('status.errors')"><AppIcon name="check" :size="13" /> 0</span>
      <span class="status-item warn" :title="store.t('status.changes')"><AppIcon name="warn" :size="13" /> {{ dirtyCount() }}</span>
    </div>
    <div class="status-right">
      <span class="status-item status-click" @click="store.toast('TinyIDE v0.5.0 — Tauri 2 · Vue 3 · Monaco · AGPL-3.0')">
        {{ active() ? active()!.language : 'Plain Text' }}
      </span>
      <span class="status-item">Ln {{ cursor.line }}, Col {{ cursor.col }}</span>
      <span class="status-item">{{ store.t('status.spaces') }}: {{ store.settings.tabSize }}</span>
      <span class="status-item">UTF-8</span>
      <span class="status-item">LF</span>
      <button
        class="status-btn"
        :class="{ on: store.settings.trail }"
        title="Курсор-комета: вкл/выкл"
        @click="store.updateSettings({ trail: !store.settings.trail })"
      >
        <AppIcon name="comet" />
      </button>
      <button
        class="status-btn"
        :class="{ on: store.panelOpen }"
        :title="store.t('menu.toggleTerminal') + ' (Ctrl+`)'"
        @click="store.setPanelOpen(!store.panelOpen)"
      >
        <AppIcon name="terminal" :size="15" />
      </button>
      <button
        class="status-btn"
        title="theme"
        @click="store.updateSettings({ theme: store.settings.theme === 'dark' ? 'light' : 'dark' })"
      >
        <AppIcon :name="store.settings.theme === 'dark' ? 'sun' : 'moon'" />
      </button>
    </div>
  </div>
</template>
