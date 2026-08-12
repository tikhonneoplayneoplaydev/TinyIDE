<script setup lang="ts">
withDefaults(defineProps<{ hidden?: boolean }>(), { hidden: false });
</script>

<template>
  <div class="splash" :class="{ gone: hidden }">
    <div class="splash-orbit">
      <div class="splash-orbit-ring" />
      <svg class="splash-logo" width="104" height="104" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="splashGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="55%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#f472b6" />
          </linearGradient>
        </defs>
        <path
          d="M4.5 19.5C8 16 10 12.5 13.5 8.5c2.3-2.6 4.6-3.6 6-3 1.2.5 1.5 2 .2 4.4-.8 1.5-2 3-3.3 4.4-3.4 3.6-7 5.2-11.9 5.2z"
          fill="url(#splashGrad)"
          opacity="0.9"
        />
        <circle cx="17.6" cy="6.4" r="2.6" fill="#eafcff" />
      </svg>
    </div>
    <h1 class="splash-title">Tiny<span>IDE</span></h1>
    <div class="splash-bar"><div class="splash-bar-fill" /></div>
    <p class="splash-tip">Загружаем Monaco… курсор-комета уже в пути 🚀</p>
  </div>
</template>
