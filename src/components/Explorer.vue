<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { FsNode, MenuItemDef } from '../types';
import { store } from '../store';
import { createDir as fsCreateDir, createFile as fsCreateFile } from '../fs/bridge';
import TreeNode from './TreeNode.vue';
import AppIcon from './AppIcon.vue';

const expanded = ref(new Set<string>());
const creating = ref(false);
const createName = ref('');
const createKind = ref<'file' | 'dir'>('file');

const ws = computed(() => store.workspace);

const rootOpen = computed(() => (ws.value ? expanded.value.has(ws.value.rootPath) : false));

function seedExpansion() {
  const w = ws.value;
  if (!w) return;
  const exp = new Set<string>();
  if (w.mode === 'real') {
    // реальный режим — дерево ленивое, раскрываем только корень
    exp.add(w.rootPath);
  } else {
    const seed = (n: FsNode, depth: number) => {
      if (n.kind !== 'dir') return;
      if (depth <= 1) exp.add(n.path);
      n.children?.forEach((c) => seed(c, depth + 1));
    };
    seed(w.tree, 0);
  }
  expanded.value = exp;
}

onMounted(seedExpansion);
watch(() => store.workspace?.rootPath, seedExpansion);

const toggleRoot = () => {
  const w = ws.value;
  if (!w) return;
  const s = new Set(expanded.value);
  if (s.has(w.rootPath)) s.delete(w.rootPath);
  else s.add(w.rootPath);
  expanded.value = s;
};

function openMenu(e: MouseEvent) {
  e.preventDefault();
  if (!ws.value) return;
  const base: (MenuItemDef | 'sep')[] = [
    { label: store.t('common.newFile'), run: () => startCreate('file') },
    { label: store.t('common.newFolder'), run: () => startCreate('dir') },
    'sep',
    { label: store.t('common.refresh'), run: () => store.refreshTree() },
  ];
  store.setMenu({ x: e.clientX, y: e.clientY, items: base });
}

function startCreate(kind: 'file' | 'dir') {
  const w = ws.value;
  if (!w) return;
  createKind.value = kind;
  createName.value = kind === 'dir' ? 'new-folder' : 'new-file.txt';
  creating.value = true;
  expanded.value = new Set(expanded.value).add(w.rootPath);
}

function commitCreate() {
  const n = createName.value.trim();
  creating.value = false;
  const w = ws.value;
  if (!n || n.includes('/') || !w) return;
  const path = w.rootPath + '/' + n;
  store.doFsOp(() => (createKind.value === 'file' ? fsCreateFile(w, path) : fsCreateDir(w, path)));
}

function selectAll(e: FocusEvent) {
  const el = e.target as HTMLInputElement;
  el.select();
  const dot = createName.value.lastIndexOf('.');
  if (dot > 0) el.setSelectionRange(0, dot);
}
</script>

<template>
  <div v-if="ws" class="explorer">
    <div class="panel-header">
      <span class="panel-title">{{ store.t('explorer.title') }}</span>
      <div class="panel-actions">
        <button :title="store.t('common.newFile')" @click="startCreate('file')"><AppIcon name="plus" :size="13" /></button>
        <button :title="store.t('common.newFolder')" @click="startCreate('dir')"><AppIcon name="folder" :size="13" /></button>
        <button :title="store.t('common.refresh')" @click="store.refreshTree()"><AppIcon name="refresh" :size="13" /></button>
      </div>
    </div>
    <div class="explorer-tree" @contextmenu="openMenu">
      <div class="root-row" @click="toggleRoot">
        <AppIcon name="chevron" class="tree-chevron" :class="{ open: rootOpen }" :size="13" />
        <AppIcon :name="rootOpen ? 'folderOpen' : 'folder'" :size="15" />
        <span class="root-name">{{ ws.rootName }}</span>
        <span v-if="ws.mode === 'virtual'" class="root-badge">example</span>
      </div>
      <div class="tree-children" :class="{ open: rootOpen }">
        <div class="tree-children-inner">
          <TreeNode v-for="c in ws.tree.children" :key="c.path" :node="c" :depth="0" />
          <div v-if="creating" class="tree-row create-row" style="--depth: 0">
            <AppIcon :name="createKind === 'dir' ? 'folder' : 'file'" :size="15" />
            <input
              v-model="createName"
              class="tree-input"
              autofocus
              @keydown.enter="commitCreate"
              @keydown.esc="creating = false"
              @blur="commitCreate"
              @focus="selectAll"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
