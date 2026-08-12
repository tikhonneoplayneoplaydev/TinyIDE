<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { store } from '../store';
import { getPlugins, togglePlugin, loadPluginSystem } from '../plugins/manager';
import { installPlugin, uninstallPlugin } from '../plugins/bridge';
import { isTauri, openFolderDialog } from '../fs/bridge';
import AppIcon from './AppIcon.vue';

type RemotePlugin = {
  name: string;
  display_name: string;
  publisher: string;
  version: string;
  description: string;
  size_kb?: number;
  builtin?: boolean;
};

const plugins = ref(getPlugins());
const busy = ref(false);
const output = ref('');
const market = ref<RemotePlugin[]>([]);
const marketLoading = ref(false);

const localNames = computed(() => new Set(plugins.value.map((p) => p.name)));

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
    store.toast(store.t('toast.desktopOnly'));
    return;
  }
  const dir = await openFolderDialog(store.t('git.folder'));
  if (!dir) return;
  busy.value = true;
  output.value = '';
  try {
    const name = await installPlugin(dir);
    output.value = `\x1b[32m${store.t('plugins.installedOk')}: ${name}\x1b[0m\n`;
    await refresh();
  } catch (e) {
    output.value = '\x1b[31m' + store.t('toast.configError') + '\x1b[0m ' + String(e);
  } finally {
    busy.value = false;
  }
}

async function remove(name: string) {
  try {
    await uninstallPlugin(name);
    output.value = '\x1b[32m' + store.t('plugins.removedOk') + '\x1b[0m\n';
    await refresh();
  } catch (e) {
    output.value = '\x1b[31m' + String(e) + '\x1b[0m';
  }
}

// ─── маркет из отдельного реестра (registry.json в любом GitHub-репо) ─────
async function checkMarket() {
  const url = store.settings.registryUrl.trim();
  if (!url) {
    store.toast(store.t('plugins.invalidUrl'));
    return;
  }
  marketLoading.value = true;
  output.value = '';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const reg = await res.json();
    market.value = reg.plugins ?? [];
    output.value = `\x1b[32m${store.t('plugins.market')}: ${market.value.length}\x1b[0m\n`;
  } catch (e) {
    output.value = '\x1b[31m' + String(e) + '\x1b[0m';
    market.value = [];
  } finally {
    marketLoading.value = false;
  }
}

async function installRemote(p: RemotePlugin) {
  if (!isTauri) {
    store.toast(store.t('plugins.desktopOnly'));
    return;
  }
  busy.value = true;
  output.value = '';
  try {
    const base = store.settings.registryUrl.replace(/registry\.json[^/]*$/, '');
    const { invoke } = await import('@tauri-apps/api/core');
    const dir = (await invoke('plugins_dir')) as string;
    const dest = dir + '/' + p.name;
    await invoke('create_dir', { path: dest });
    // plugin.toml
    const tomlRes = await fetch(base + p.name + '/plugin.toml');
    const toml = await tomlRes.text();
    await invoke('write_file', { path: dest + '/plugin.toml', content: toml });
    // plugin.wasm → base64
    const wasmRes = await fetch(base + p.name + '/plugin.wasm');
    const buf = await wasmRes.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const b64 = btoa(bin);
    await invoke('write_binary', { path: dest + '/plugin.wasm', base64Data: b64 });
    output.value = `\x1b[32m${store.t('plugins.installedOk')}: ${p.name} v${p.version}\x1b[0m\n`;
    market.value = market.value.filter((x) => x.name !== p.name);
    await refresh();
  } catch (e) {
    output.value = '\x1b[31m' + String(e) + '\x1b[0m';
  } finally {
    busy.value = false;
  }
}

const styled = (line: string) =>
  line
    .replace(/\x1b\[90m/g, '<span class="tc-dim">')
    .replace(/\x1b\[31m/g, '<span class="tc-red">')
    .replace(/\x1b\[32m/g, '<span class="tc-green">')
    .replace(/\x1b\[36m/g, '<span class="tc-cyan">')
    .replace(/\x1b\[0m/g, '</span>');
</script>

<template>
  <div class="plugins-panel">
    <div class="panel-header">
      <span class="panel-title">{{ store.t('plugins.title') }}</span>
      <div class="panel-actions">
        <button :title="store.t('common.refresh')" @click="refresh"><AppIcon name="refresh" :size="13" /></button>
      </div>
    </div>

    <div class="plugins-note">{{ store.t('plugins.note') }}</div>

    <!-- маркет из реестра -->
    <div class="plugins-registry">
      <div class="setting-row" style="padding: 2px 0">
        <span>{{ store.t('plugins.registry') }}</span>
        <button class="btn git-act" :disabled="marketLoading" @click="checkMarket">
          {{ store.t('plugins.checkMarket') }}
        </button>
      </div>
      <input
        v-model="store.settings.registryUrl"
        class="git-input"
        placeholder="https://…/registry.json"
        @keydown.enter="checkMarket"
      />
    </div>

    <div v-if="market.length" class="plugins-market">
      <div class="plugins-api-title">{{ store.t('plugins.market') }} ({{ market.length }})</div>
      <div v-for="p in market" :key="p.name" class="plugin-card market">
        <div class="plugin-head">
          <span class="plugin-wasm-badge">WASM</span>
          <span class="plugin-name">{{ p.display_name }}</span>
          <span class="plugin-ver">v{{ p.version }}</span>
        </div>
        <div class="plugin-desc">{{ p.description }}</div>
        <div class="plugin-meta">
          <span class="plugin-pub">{{ p.publisher }}</span>
          <span v-if="p.size_kb" class="plugin-size">{{ p.size_kb }} {{ store.t('plugins.kb') }}</span>
        </div>
        <div class="plugin-actions">
          <button
            v-if="!localNames.has(p.name)"
            class="btn git-act primary"
            :disabled="busy"
            @click="installRemote(p)"
          >
            {{ store.t('plugins.install') }}
          </button>
          <span v-else class="plugins-installed">{{ store.t('plugins.installed') }}</span>
        </div>
      </div>
    </div>

    <div class="plugins-api-title" style="padding: 6px 14px 4px">{{ store.t('plugins.installedList') }} ({{ plugins.length }})</div>
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
          <span v-if="p.builtin" class="plugin-builtin">{{ store.t('plugins.builtin') }}</span>
          <span class="plugin-size">{{ p.size_kb }} {{ store.t('plugins.kb') }}</span>
          <span class="plugin-status" :class="{ ok: p.loaded }">{{ p.loaded ? store.t('plugins.loaded') : store.t('plugins.off') }}</span>
        </div>
        <div class="plugin-actions">
          <button class="btn git-act" :class="{ primary: p.enabled }" @click="toggle(p)">
            {{ p.enabled ? store.t('plugins.disable') : store.t('plugins.enable') }}
          </button>
          <button v-if="!p.builtin" class="btn git-act" @click="remove(p.name)">{{ store.t('plugins.remove') }}</button>
        </div>
      </div>
    </div>

    <button class="btn ghost plugins-install" :disabled="busy" @click="install">
      <AppIcon name="plus" :size="13" /> {{ store.t('plugins.installFolder') }}
    </button>

    <div v-if="output" class="plugins-output">
      <div v-for="(line, i) in output.split('\n')" :key="i" v-html="styled(line) || '&nbsp;'" />
    </div>

    <div class="plugins-api">
      <div class="plugins-api-title">{{ store.t('plugins.api') }}</div>
      <code>alloc(len) → ptr</code>
      <code>dealloc(ptr, len)</code>
      <code>tinyide_handle(cmd, len, out, cap) → len</code>
      <p>{{ store.t('plugins.apiNote') }}</p>
    </div>
  </div>
</template>
