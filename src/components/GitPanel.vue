<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { store } from '../store';
import { isTauri, openFolderDialog } from '../fs/bridge';
import {
  gitStatus, gitRemoteInfo, gitClone, gitPull, gitPush, gitCommit, gitInit,
  detectProvider, embedToken,
} from '../git/bridge';
import type { GitInfo, RemoteInfo } from '../git/bridge';
import AppIcon from './AppIcon.vue';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  M: { label: 'изменён', cls: 'st-modified' },
  A: { label: 'добавлен', cls: 'st-added' },
  D: { label: 'удалён', cls: 'st-deleted' },
  R: { label: 'переименован', cls: 'st-renamed' },
  U: { label: 'конфликт', cls: 'st-conflict' },
  '??': { label: 'не отслеживается', cls: 'st-untracked' },
};

const branch = ref<string | null>(null);
const files = ref<{ path: string; status: string }[]>([]);
const remote = ref<RemoteInfo | null>(null);
const err = ref<string | null>(null);
const loading = ref(false);
const output = ref('');
const busy = ref(false);

// клонирование
const cloneUrl = ref('');
const cloneToken = ref('');
const showToken = ref(false);

// коммит
const commitMsg = ref('');

const provider = computed(() => detectProvider(remote.value?.url ?? null));

const isRepo = computed(() => !!(remote.value?.branch || remote.value?.url) && !err.value);

async function load() {
  const ws = store.workspace;
  if (!ws) return;
  if (!isTauri) {
    err.value = store.t('git.desktopOnly');
    return;
  }
  loading.value = true;
  try {
    const info = await gitStatus(ws.rootPath);
    branch.value = info.branch;
    files.value = info.files;
    err.value = null;
  } catch (e) {
    err.value = String(e);
    files.value = [];
    branch.value = null;
  }
  try {
    remote.value = await gitRemoteInfo(ws.rootPath);
  } catch {
    remote.value = null;
  }
  loading.value = false;
}

onMounted(load);

const styled = (line: string) =>
  line
    .replace(/\x1b\[90m/g, '<span class="tc-dim">')
    .replace(/\x1b\[31m/g, '<span class="tc-red">')
    .replace(/\x1b\[32m/g, '<span class="tc-green">')
    .replace(/\x1b\[36m/g, '<span class="tc-cyan">')
    .replace(/\x1b\[0m/g, '</span>');

async function runGit(op: () => Promise<string>, okMsg: string) {
  const ws = store.workspace;
  if (!ws) return;
  busy.value = true;
  output.value = '';
  try {
    const res = await op();
    output.value = '\x1b[32m' + okMsg + '\x1b[0m\n' + res;
    await load();
  } catch (e) {
    output.value = '\x1b[31mОшибка:\x1b[0m\n' + String(e);
  } finally {
    busy.value = false;
  }
}

const pull = () => store.workspace && runGit(() => gitPull(store.workspace!.rootPath), store.t('git.pullDone'));
const push = () => store.workspace && runGit(() => gitPush(store.workspace!.rootPath), store.t('git.pushDone'));
const commit = () => {
  const m = commitMsg.value.trim();
  if (!m) {
    store.toast(store.t('git.enterMsg'));
    return;
  }
  commitMsg.value = '';
  store.workspace && runGit(() => gitCommit(store.workspace!.rootPath, m), store.t('git.commitDone'));
};
const init = () => store.workspace && runGit(() => gitInit(store.workspace!.rootPath), store.t('git.initDone'));

async function clone() {
  const url = cloneUrl.value.trim();
  if (!url) {
    store.toast(store.t('git.enterUrl'));
    return;
  }
  busy.value = true;
  output.value = '';
  try {
    const parent = await openFolderDialog(store.t('git.cloneWhere'));
    if (!parent) {
      busy.value = false;
      return;
    }
    const authUrl = embedToken(url, cloneToken.value);
    output.value = '\x1b[36m$ git clone ' + authUrl.replace(/https:\/\/[^@]+@/, 'https://***@') + '\x1b[0m\n';
    const cloned = await gitClone(authUrl, parent);
    output.value += '\x1b[32m✓ Клонировано: ' + cloned + '\x1b[0m\n';
    cloneUrl.value = '';
    cloneToken.value = '';
    await store.setWorkspacePath(cloned, store.t('git.repoOpened') + ': ' + cloned.split('/').pop());
    await load();
  } catch (e) {
    output.value += '\x1b[31mОшибка:\x1b[0m\n' + String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="git-panel">
    <div class="panel-header">
      <span class="panel-title">{{ store.t('git.title') }}</span>
      <div class="panel-actions">
        <button :title="store.t('common.refresh')" :disabled="busy" @click="load"><AppIcon name="refresh" :size="13" /></button>
      </div>
    </div>

    <div v-if="!isTauri" class="git-empty">{{ err }}</div>

    <!-- клонирование -->
    <template v-if="!isRepo && isTauri">
      <div class="git-clone">
        <div class="git-clone-title">
          <AppIcon name="git" :size="14" />
          {{ store.t('git.clone') }}
        </div>
        <input v-model="cloneUrl" class="git-input" :placeholder="store.t('git.clonePlaceholder')" @keydown.enter="clone" />
        <div class="git-token-row">
          <input
            v-model="cloneToken"
            class="git-input"
            :type="showToken ? 'text' : 'password'"
            :placeholder="store.t('git.tokenPlaceholder')"
            @keydown.enter="clone"
          />
          <button class="btn-icon" :title="showToken ? 'Скрыть' : 'Показать'" @click="showToken = !showToken">
            {{ showToken ? '🙈' : '👁' }}
          </button>
        </div>
        <button class="btn primary git-clone-btn" :disabled="busy" @click="clone">
          <AppIcon name="git" :size="14" /> Клонировать
        </button>
        <div class="git-hint">{{ store.t('git.hint') }}</div>
      </div>
      <div class="git-sep" />
      <button class="btn ghost git-init-btn" :disabled="busy" @click="init"> {{ store.t('git.init') }}</button>
    </template>

    <!-- состояние репозитория -->
    <template v-if="isRepo">
      <div class="git-repo">
        <div class="git-provider" :style="{ background: provider.color + '22', borderColor: provider.color + '55' }">
          <span class="git-provider-dot" :style="{ background: provider.color }" />
          {{ provider.name }}
        </div>
        <div class="git-branch-row">
          <AppIcon name="branch" :size="13" />
          <span class="git-branch-name">{{ remote?.branch ?? branch ?? '—' }}</span>
          <span v-if="remote?.ahead || remote?.behind" class="git-ab">
            <span v-if="remote!.ahead" class="git-ab-ahead">↑{{ remote!.ahead }}</span>
            <span v-if="remote!.behind" class="git-ab-behind">↓{{ remote!.behind }}</span>
          </span>
        </div>
        <div v-if="remote?.url" class="git-remote-url" :title="remote.url">{{ remote.url }}</div>
      </div>

      <div class="git-actions">
        <button class="btn git-act" :disabled="busy" :title="store.t('git.pull')" @click="pull">
          <AppIcon name="sync" :size="13" /> {{ store.t('git.pull') }}
        </button>
        <button class="btn git-act" :disabled="busy" :title="store.t('git.push')" @click="push">
          <AppIcon name="check" :size="13" /> {{ store.t('git.push') }}
        </button>
        <button class="btn git-act" :disabled="busy" :title="store.t('git.init')" @click="init">
          <AppIcon name="plus" :size="13" /> Init
        </button>
      </div>

      <div class="git-commit-row">
        <input v-model="commitMsg" class="git-input" :placeholder="store.t('git.commitPlaceholder')" @keydown.enter="commit" />
        <button class="btn primary git-act" :disabled="busy || !commitMsg.trim()" @click="commit"> {{ store.t('git.commit') }}</button>
      </div>
    </template>

    <!-- вывод команд -->
    <div v-if="output" class="git-output">
      <div v-for="(line, i) in output.split('\n')" :key="i" v-html="styled(line) || '&nbsp;'" />
    </div>

    <!-- файлы -->
    <div v-if="isRepo" class="git-list-head">Изменения ({{ files.length }})</div>
    <div v-if="!err && isRepo && files.length === 0 && !loading" class="git-empty">{{ store.t('git.clean') }}</div>
    <div class="git-list">
      <div
        v-for="(f, i) in files"
        :key="i"
        class="git-file"
        :title="f.path"
        @click="store.openFile(f.path)"
      >
        <span class="git-status" :class="STATUS_META[f.status]?.cls ?? 'st-modified'">
          {{ STATUS_META[f.status]?.label ?? f.status }}
        </span>
        <span class="git-path">{{ f.path }}</span>
      </div>
    </div>
  </div>
</template>
