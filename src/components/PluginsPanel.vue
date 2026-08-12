<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { store } from '../store';
import { getPlugins, togglePlugin, loadPluginSystem } from '../plugins/manager';
import { installPlugin, uninstallPlugin } from '../plugins/bridge';
import { isTauri, openFolderDialog } from '../fs/bridge';
import AppIcon from './AppIcon.vue';

const plugins = ref(getPlugins());
const busy = ref(false);
const output = ref('');

async function refresh() {
  await loadPluginSystem();
  plugins.value = getPlugins();
}

onMounted(refresh);

async function toggle(p: (typeof plugins.value)[number]) {
  await togglePlugin(p.name);
  plugins.value = getPlugins();
}

async function install() {
  if (!isTauri) {
    store.toast('Установка плагинов — в десктоп-версии');
    return;
  }
  const dir = await openFolderDialog('Папка плагина (plugin.toml + plugin.wasm)');
  if (!dir) return;
  busy.value = true;
  output.value = '';
  try {
    const name = await installPlugin(dir);
    output.value = '\x1b[32m✓ Плагин «' + name + '» установлен\x1b[0m\n';
    await refresh();
  } catch (e) {
    output.value = '\x1b[31mОшибка:\x1b[0m ' + String(e);
  } finally {
    busy.value = false;
  }
}

async function remove(name: string) {
  try {
    await uninstallPlugin(name);
    output.value = '\x1b[32m✓ Плагин удалён\x1b[0m\n';
    await refresh();
  } catch (e) {
    output.value = '\x1b[31mОшибка:\x1b[0m ' + String(e);
  }
}

const styled = (line: string) =>
  line
    .replace(/\x1b\[90m/g, '<span class="tc-dim">')
    .replace(/\x1b\[31m/g, '<span class="tc-red">')
    .replace(/\x1b\[32m/g, '<span class="tc-green">')
    .replace(/\x1b\[0m/g, '</span>');
</script>

<template>
  <div class="plugins-panel">
    <div class="panel-header">
      <span class="panel-title">Plugins</span>
      <div class="panel-actions">
        <button title="Обновить" @click="refresh"><AppIcon name="refresh" :size="13" /></button>
      </div>
    </div>

    <div class="plugins-note">
      Плагины TinyIDE — это <b>WebAssembly</b>-модули: работают в десктопе (wasmi)
      и в браузере (нативный WASM) — один и тот же файл.
    </div>

    <div class="plugins-list">
      <div v-for="p in plugins" :key="p.name" class="plugin-card" :class="{ disabled: !p.enabled }">
        <div class="plugin-head">
          <span class="plugin-wasm-badge">WASM</span>
          <span class="plugin-name">{{ p.display_name }}</span>
          <span class="plugin-ver">v{{ p.version }}</span>
        </div>
        <div class="plugin-desc">{{ p.description }}</div>
        <div class="plugin-meta">
          <span class="plugin-pub">{{ p.publisher }}</span>
          <span v-if="p.builtin" class="plugin-builtin">встроенный</span>
          <span class="plugin-size">{{ p.size_kb }} КБ</span>
          <span class="plugin-status" :class="{ ok: p.loaded }">{{ p.loaded ? '● загружен' : '○ выключен' }}</span>
        </div>
        <div class="plugin-actions">
          <button class="btn git-act" :class="{ primary: p.enabled }" @click="toggle(p)">
            {{ p.enabled ? 'Отключить' : 'Включить' }}
          </button>
          <button v-if="!p.builtin" class="btn git-act" @click="remove(p.name)">Удалить</button>
        </div>
      </div>
    </div>

    <button class="btn ghost plugins-install" :disabled="busy" @click="install">
      <AppIcon name="plus" :size="13" /> Установить из папки…
    </button>

    <div v-if="output" class="plugins-output">
      <div v-for="(line, i) in output.split('\n')" :key="i" v-html="styled(line) || '&nbsp;'" />
    </div>

    <div class="plugins-api">
      <div class="plugins-api-title">Plugin API</div>
      <code>alloc(len) → ptr</code>
      <code>dealloc(ptr, len)</code>
      <code>tinyide_handle(cmd, len, out, cap) → len</code>
      <p>Команды: <code>init</code>, <code>completions</code>, <code>diagnose</code>, <code>transpile</code>, <code>outline</code> — JSON in/out.</p>
    </div>
  </div>
</template>
