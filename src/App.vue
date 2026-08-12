<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { store, commands, applyAccentCSS, initHotkeys, startSplashTimer } from './store';
import TitleBar from './components/TitleBar.vue';
import ActivityBar from './components/ActivityBar.vue';
import Explorer from './components/Explorer.vue';
import TabsBar from './components/TabsBar.vue';
import EditorPane from './editor/EditorPane.vue';
import StatusBar from './components/StatusBar.vue';
import SearchPanel from './components/SearchPanel.vue';
import LanguagesPanel from './components/LanguagesPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import GitPanel from './components/GitPanel.vue';
import BottomPanel from './components/BottomPanel.vue';
import Palette from './components/Palette.vue';
import ContextMenu from './components/ContextMenu.vue';
import Splash from './components/Splash.vue';
import Welcome from './components/Welcome.vue';
import FunoPanel from './funo/FunoPanel.vue';

onMounted(() => {
  initHotkeys();
  startSplashTimer();
  applyAccentCSS(store.settings.accent);
  // debug-хук для e2e/отладки
  (window as unknown as { __tinyide?: unknown }).__tinyide = store;
});

watch(
  () => store.settings.accent,
  (a) => applyAccentCSS(a)
);

const activeFileName = () => {
  const f = store.openFiles.find((x) => x.path === store.activePath);
  return f ? f.name : null;
};
</script>

<template>
  <div class="app" :data-theme="store.settings.theme">
    <Splash v-if="store.splash !== 'gone'" :hidden="store.splash === 'hide'" />
    <TitleBar :active-file="activeFileName()" />
    <div class="app-body">
      <div v-if="store.sidebarOpen" class="sidebar">
        <ActivityBar />
        <div class="sidebar-panel">
          <Explorer v-if="store.activity === 'explorer'" />
          <SearchPanel v-else-if="store.activity === 'search'" />
          <GitPanel v-else-if="store.activity === 'source'" />
          <FunoPanel v-else-if="store.activity === 'funo'" />
          <LanguagesPanel v-else-if="store.activity === 'languages'" />
          <SettingsPanel v-else-if="store.activity === 'settings'" />
        </div>
      </div>
      <div class="main">
        <TabsBar />
        <div class="editor-area">
          <EditorPane />
          <Welcome v-if="!store.activePath" />
        </div>
        <BottomPanel v-if="store.panelOpen" />
      </div>
    </div>
    <StatusBar />
    <Palette v-if="store.palette" />
    <ContextMenu v-if="store.menu" />
    <div v-if="store.toastMsg" class="toast">{{ store.toastMsg }}</div>
  </div>
</template>
