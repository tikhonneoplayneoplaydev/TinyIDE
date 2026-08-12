<script setup lang="ts">
import { ref } from 'vue';
import type { FsNode, MenuItemDef } from '../types';
import { store } from '../store';
import {
  createDir as fsCreateDir,
  createFile as fsCreateFile,
  deletePath as fsDeletePath,
} from '../fs/bridge';
import { languageForPath } from '../editor/monacoSetup';
import LangLogo from '../languages/LangLogo.vue';
import AppIcon from './AppIcon.vue';

// ─── рекурсивный узел дерева ──────────────────────────────────────────────
const props = defineProps<{ node: FsNode; depth: number }>();

const expanded = ref(false);
const renaming = ref(false);
const renameName = ref('');

const isDir = props.node.kind === 'dir';
const visible = (n: FsNode) => store.settings.showHidden || !n.name.startsWith('.');

function toggle() {
  if (!isDir) return;
  expanded.value = !expanded.value;
  if (expanded.value && !props.node.loaded) {
    store.expandDir(props.node);
  }
}

function openMenu(e: MouseEvent, node: FsNode) {
  e.preventDefault();
  e.stopPropagation();
  const ws = store.workspace;
  if (!ws) return;
  const base: (MenuItemDef | 'sep')[] = [
    { label: store.t('common.newFile'), run: () => store.requestCreate(node.path, 'file') },
    { label: store.t('common.newFolder'), run: () => store.requestCreate(node.path, 'dir') },
    'sep',
  ];
  if (node.kind === 'dir') {
    base.push({ label: store.t('common.collapseAll'), run: () => (expanded.value = false) });
  }
  base.push(
    {
      label: store.t('common.rename'),
      run: () => {
        renameName.value = node.name;
        renaming.value = true;
      },
    },
    {
      label: store.t('common.delete'),
      danger: true,
      run: () => {
        store.doFsOp(() => fsDeletePath(ws, node.path)).then(() => {
          const prefix = node.path + (node.kind === 'dir' ? '/' : '');
          store.openFiles.forEach((f) => {
            if (f.path === node.path || f.path.startsWith(prefix)) store.closeTab(f.path);
          });
          store.toast(store.t('toast.deleted') + ' ' + node.name);
        });
      },
    },
    'sep',
    {
      label: store.t('common.copyPath'),
      run: () => {
        navigator.clipboard?.writeText(node.path).catch(() => undefined);
        store.toast(store.t('toast.pathCopied'));
      },
    }
  );
  store.setMenu({ x: e.clientX, y: e.clientY, items: base });
}

function commitRename() {
  const n = renameName.value.trim();
  renaming.value = false;
  if (!n || n === props.node.name || n.includes('/')) return;
  const parent = props.node.path.slice(0, props.node.path.lastIndexOf('/'));
  store.renameFile(props.node.path, parent + '/' + n);
}

function selectAll(e: FocusEvent) {
  const el = e.target as HTMLInputElement;
  el.select();
  const dot = renameName.value.lastIndexOf('.');
  if (dot > 0) el.setSelectionRange(0, dot);
}

// ─── создание внутри папки ─────────────────────────────────────────────────
const creating = ref(false);
const createName = ref('');

function commitCreate() {
  const n = createName.value.trim();
  creating.value = false;
  if (!n || n.includes('/')) return;
  const ws = store.workspace;
  if (!ws) return;
  const path = props.node.path + '/' + n;
  store.doFsOp(() => (props.node.kind === 'dir' ? fsCreateFile(ws, path) : fsCreateFile(ws, path)));
  expanded.value = true;
}
</script>

<template>
  <div v-if="visible(node)">
    <!-- папка -->
    <div v-if="node.kind === 'dir'">
      <div
        class="tree-row"
        :style="{ '--depth': depth }"
        :title="node.path"
        @click="toggle"
        @contextmenu="openMenu($event, node)"
      >
        <AppIcon name="chevron" class="tree-chevron" :class="{ open: expanded }" :size="13" />
        <AppIcon :name="expanded ? 'folderOpen' : 'folder'" :size="15" />
        <span class="tree-name">{{ node.name }}</span>
      </div>
      <div class="tree-children" :class="{ open: expanded }">
        <div class="tree-children-inner">
          <TreeNode v-for="c in node.children" :key="c.path" :node="c" :depth="depth + 1" />
          <!-- создание нового файла/папки внутри этой папки -->
          <div v-if="creating" class="tree-row create-row" :style="{ '--depth': depth + 1 }">
            <AppIcon name="file" :size="15" />
            <input
              ref="createInput"
              v-model="createName"
              class="tree-input"
              autofocus
              @keydown.enter="commitCreate"
              @keydown.esc="creating = false"
              @blur="commitCreate"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- файл -->
    <div
      v-else
      class="tree-row"
      :class="{ active: node.path === store.activePath }"
      :style="{ '--depth': depth }"
      :title="node.path"
      @click="store.openFile(node.path)"
      @contextmenu="openMenu($event, node)"
    >
      <span class="tree-indent" />
      <template v-if="renaming">
        <input
          v-model="renameName"
          class="tree-input"
          autofocus
          @keydown.enter="commitRename"
          @keydown.esc="renaming = false"
          @blur="commitRename"
          @focus="selectAll"
        />
      </template>
      <template v-else>
        <LangLogo :lang="languageForPath(node.path)" :size="15" />
        <span class="tree-name">{{ node.name }}</span>
      </template>
    </div>
  </div>
</template>
