<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
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
import PluginsPanel from './components/PluginsPanel.vue';
import BottomPanel from './components/BottomPanel.vue';
import Palette from './components/Palette.vue';
import ContextMenu from './components/ContextMenu.vue';
import Splash from './components/Splash.vue';
import Welcome from './components/Welcome.vue';
import FunoPanel from './funo/FunoPanel.vue';
import { loadPluginSystem } from './plugins/manager';
import { DEMO_ROOT } from './fs/virtual';

// ─── глобальное кастомное контекстное меню (вместо системного webview) ────
function onContextMenu(e: MouseEvent) {
  const t = e.target as HTMLElement;
  // проводник / палитра / селектор оболочки управляют своим меню
  if (t.closest('.tree-row') || t.closest('.menu') || t.closest('.shell-selector') || t.closest('.palette')) return;
  e.preventDefault();
  const api = store.editorApi;
  const inEditor = !!t.closest('.monaco-editor') || !!t.closest('.editor-host') || !!t.closest('.cursor-fx');
  const items: { label: string; danger?: boolean; run: () => void }[] = [];
  if (inEditor && api) {
    items.push(
      { label: store.t('menu.cut'), run: () => api.cut() },
      { label: store.t('menu.copy'), run: () => api.copy() },
      { label: store.t('menu.paste'), run: () => api.paste() },
      { label: store.t('menu.selectAll'), run: () => api.selectAll() },
      'sep' as never,
      { label: store.t('menu.format'), run: () => api.format() },
      'sep' as never,
      { label: store.t('menu.commandPalette'), run: () => store.setPalette({ mode: 'command' }) },
      { label: store.t('menu.quickOpen'), run: () => store.setPalette({ mode: 'quick' }) }
    );
  } else {
    const root = store.workspace?.rootPath;
    items.push(
      { label: store.t('common.newFile'), run: () => { store.setActivity('explorer'); store.setSidebarOpen(true); store.requestCreate(root ?? DEMO_ROOT, 'file'); } },
      { label: store.t('common.newFolder'), run: () => { store.setActivity('explorer'); store.setSidebarOpen(true); store.requestCreate(root ?? DEMO_ROOT, 'dir'); } },
      'sep' as never,
      { label: store.t('welcome.openFolder'), run: () => store.openFolder() },
      { label: store.t('welcome.openExample'), run: () => store.openExample() },
      'sep' as never,
      { label: store.t('menu.commandPalette'), run: () => store.setPalette({ mode: 'command' }) },
      { label: store.t('menu.quickOpen'), run: () => store.setPalette({ mode: 'quick' }) },
      { label: store.t('menu.toggleTerminal'), run: () => store.setPanelOpen(!store.panelOpen) },
      { label: store.t('menu.toggleSidebar'), run: () => store.setSidebarOpen(!store.sidebarOpen) },
      'sep' as never,
      { label: store.t('settings.title'), run: () => { store.setActivity('settings'); store.setSidebarOpen(true); } },
      { label: store.t('menu.about'), run: () => store.toast(store.t('titlebar.about')) }
    );
  }
  store.setMenu({ x: e.clientX, y: e.clientY, items });
}

onMounted(() => {
  initHotkeys();
  startSplashTimer();
  applyAccentCSS(store.settings.accent);
  loadPluginSystem();
  document.documentElement.dir = store.settings.lang === 'he' ? 'rtl' : 'ltr';
  window.addEventListener('contextmenu', onContextMenu);
  // debug-хук для e2e/отладки
  (window as unknown as { __tinyide?: unknown }).__tinyide = store;
});

onUnmounted(() => {
  window.removeEventListener('contextmenu', onContextMenu);
});

// RTL + акцент
watch(
  () => store.settings.lang,
  (l) => (document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr')
);

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
          <PluginsPanel v-else-if="store.activity === 'plugins'" />
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
