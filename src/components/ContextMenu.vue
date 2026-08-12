<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { store } from '../store';

const menu = computed(() => store.menu!);

function onDown(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.menu');
  if (!el) store.setMenu(null);
}

onMounted(() => window.addEventListener('mousedown', onDown));
onUnmounted(() => window.removeEventListener('mousedown', onDown));

const style = computed(() => {
  const m = menu.value;
  const left = Math.min(m.x, window.innerWidth - 240);
  const top = Math.min(m.y, window.innerHeight - m.items.length * 34 - 40);
  return { left: left + 'px', top: top + 'px' };
});
</script>

<template>
  <div class="menu-overlay">
    <div class="menu" :style="style">
      <template v-for="(item, i) in menu.items" :key="i">
        <div v-if="item === 'sep'" class="menu-sep" />
        <button
          v-else
          class="menu-item"
          :class="{ danger: item.danger }"
          @click="store.setMenu(null); item.run()"
        >
          {{ item.label }}
        </button>
      </template>
    </div>
  </div>
</template>
