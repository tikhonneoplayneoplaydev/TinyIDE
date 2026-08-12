<script setup lang="ts">
import { computed } from 'vue';
import { langLogos } from './logos';
import { colorForPath } from '../editor/monacoSetup';

const props = withDefaults(defineProps<{ lang?: string; path?: string; size?: number }>(), {
  lang: undefined,
  path: undefined,
  size: 15,
});

const logo = computed(() => (props.lang ? langLogos[props.lang] : undefined));
const dotColor = computed(() => (props.path ? colorForPath(props.path) : '#9aa7c4'));
</script>

<template>
  <span
    v-if="logo"
    class="lang-logo"
    :style="{ width: size + 'px', height: size + 'px', borderRadius: Math.max(3, size * 0.22) + 'px' }"
    :title="lang"
    v-html="logo.svg"
  />
  <span
    v-else
    class="file-dot"
    :style="{ width: size * 0.62 + 'px', height: size * 0.62 + 'px', background: dotColor }"
  />
</template>
