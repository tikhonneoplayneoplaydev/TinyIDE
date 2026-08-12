<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { store } from '../store';
import { gitStatus } from '../terminal/bridge';
import { isTauri } from '../fs/bridge';
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
const err = ref<string | null>(null);
const loading = ref(false);

async function load() {
  const ws = store.workspace;
  if (!ws) return;
  if (!isTauri) {
    err.value = 'Git-панель доступна в десктоп-версии (Tauri). В веб-демо — только просмотр файлов.';
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
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="git-panel">
    <div class="panel-header">
      <span class="panel-title">Source Control</span>
      <div class="panel-actions">
        <button title="Обновить" @click="load"><AppIcon name="refresh" :size="13" /></button>
      </div>
    </div>
    <div class="git-branch">
      <AppIcon name="git" :size="15" />
      <span>{{ branch ?? '—' }}</span>
    </div>
    <div v-if="err" class="git-empty">{{ err }}</div>
    <div v-if="!err && files.length === 0 && !loading" class="git-empty">Изменений нет — рабочее дерево чистое ✨</div>
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
