<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { store } from '../store';
import { SHELLS, customShellId } from '../types';
import type { CustomShell } from '../types';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const open = ref(false);
const addMode = ref(false);
const newName = ref('');
const newCommand = ref('');

const custom = computed(() => store.settings.customShells);

const items = computed(() => {
  const presets = SHELLS.map((s) => ({
    id: s.id,
    label: s.label,
    desc: s.desc,
    badge: s.badge,
    badgeBg: s.badgeBg,
    badgeFg: s.badgeFg,
    custom: false,
  }));
  const customs = custom.value.map((c) => ({
    id: customShellId(c.name),
    label: c.name,
    desc: c.command,
    badge: '⚙',
    badgeBg: '#7c3aed',
    badgeFg: '#fff',
    custom: true,
    name: c.name,
  }));
  return [...presets, ...customs];
});

const selected = computed(() => {
  if (props.modelValue.startsWith('custom:')) {
    const name = props.modelValue.slice('custom:'.length);
    const c = custom.value.find((x) => x.name === name);
    if (c) return { label: c.name, badge: '⚙', badgeBg: '#7c3aed', badgeFg: '#fff' };
  }
  const p = SHELLS.find((s) => s.id === props.modelValue);
  if (p) return { label: p.label, badge: p.badge, badgeBg: p.badgeBg, badgeFg: p.badgeFg };
  return { label: props.modelValue, badge: '$', badgeBg: '#3f4a63', badgeFg: '#fff' };
});

function choose(id: string) {
  emit('update:modelValue', id);
  open.value = false;
}

function addShell() {
  const name = newName.value.trim();
  const command = newCommand.value.trim();
  if (!name || !command) return;
  if (custom.value.some((c) => c.name === name)) {
    store.toast('Оболочка с таким именем уже есть');
    return;
  }
  store.updateSettings({
    customShells: [...custom.value, { name, command } as CustomShell],
  });
  emit('update:modelValue', customShellId(name));
  newName.value = '';
  newCommand.value = '';
  addMode.value = false;
  open.value = false;
  store.toast('Оболочка «' + name + '» добавлена (сохранится в настройках)');
}

function removeShell(name: string) {
  store.updateSettings({
    customShells: custom.value.filter((c) => c.name !== name),
  });
  if (props.modelValue === customShellId(name)) {
    emit('update:modelValue', 'shell');
  }
}

function onDocDown(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!el.closest('.shell-selector')) open.value = false;
}

onMounted(() => document.addEventListener('mousedown', onDocDown));
onUnmounted(() => document.removeEventListener('mousedown', onDocDown));
</script>

<template>
  <div class="shell-selector">
    <button class="shell-btn" :class="{ open }" @click="open = !open">
      <span class="shell-badge" :style="{ background: selected.badgeBg, color: selected.badgeFg }">
        {{ selected.badge }}
      </span>
      <span class="shell-btn-label">{{ selected.label }}</span>
      <AppIcon name="down" :size="12" class="shell-btn-chevron" :class="{ open }" />
    </button>

    <Transition name="shell-pop">
      <div v-if="open" class="shell-menu">
        <div class="shell-menu-title">Выберите оболочку</div>
        <button
          v-for="it in items"
          :key="it.id"
          class="shell-opt"
          :class="{ active: it.id === modelValue }"
          @click="choose(it.id)"
        >
          <span class="shell-badge" :style="{ background: it.badgeBg, color: it.badgeFg }">{{ it.badge }}</span>
          <span class="shell-opt-text">
            <span class="shell-opt-name">{{ it.label }}</span>
            <span class="shell-opt-desc">{{ it.desc }}</span>
          </span>
          <span v-if="it.custom" class="shell-opt-del" title="Удалить оболочку" @click.stop="removeShell(it.name!)">
            <AppIcon name="trash" :size="12" />
          </span>
          <span v-if="it.id === modelValue" class="shell-opt-check">✓</span>
        </button>

        <div class="shell-menu-sep" />

        <template v-if="addMode">
          <div class="shell-add">
            <input v-model="newName" class="shell-add-input" placeholder="имя (например: bash)" @keydown.enter="addShell" />
            <input v-model="newCommand" class="shell-add-input" placeholder="команда (например: /bin/bash)" @keydown.enter="addShell" />
            <div class="shell-add-actions">
              <button class="btn ghost shell-add-btn" @click="addMode = false">Отмена</button>
              <button class="btn primary shell-add-btn" @click="addShell">Добавить</button>
            </div>
          </div>
        </template>
        <button v-else class="shell-add-open" @click="addMode = true">
          <AppIcon name="plus" :size="13" /> Добавить свою оболочку
        </button>
      </div>
    </Transition>
  </div>
</template>
