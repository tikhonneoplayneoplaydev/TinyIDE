<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { store, getMonacoEditor } from '../store';

const auraRef = ref<HTMLDivElement | null>(null);
const trailRef = ref<HTMLDivElement | null>(null);
const sparksRef = ref<HTMLDivElement | null>(null);

function spawnSparks(container: HTMLElement, at: { x: number; y: number }, count: number) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'fx-spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 24;
    el.style.left = at.x + 'px';
    el.style.top = at.y + 'px';
    el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    el.style.background = i % 2 ? '#a78bfa' : '#67e8f9';
    el.style.setProperty('--sz', (4 + Math.random() * 3).toFixed(1) + 'px');
    container.appendChild(el);
    window.setTimeout(() => el.remove(), 700);
  }
}

let disposed = false;
let listeners: monaco.IDisposable[] = [];
let raf = 0;

onMounted(() => {
  const target = { x: 0, y: 0, vis: false };
  const cur = { x: 0, y: 0 };

  const start = (ed: monaco.editor.IStandaloneCodeEditor) => {
    listeners = [
      ed.onDidChangeCursorPosition((e) => {
        const p = ed.getScrolledVisiblePosition(e.position);
        if (p) {
          target.x = p.left + 1;
          target.y = p.top + p.height / 2;
          target.vis = true;
        }
      }),
      ed.onDidBlurEditorWidget(() => (target.vis = false)),
      ed.onDidFocusEditorWidget(() => (target.vis = true)),
      ed.onKeyDown((e) => {
        const key = e.browserEvent.key;
        const s = store.settings;
        if (
          s.particles &&
          key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          sparksRef.value &&
          target.vis
        ) {
          const count = Math.round(2 + (s.particlesIntensity / 100) * 4);
          spawnSparks(sparksRef.value, target, count);
        }
      }),
    ];

    let lastAuraOp = -1;
    let lastTrailOp = -1;
    let lastT = '';
    const loop = () => {
      if (disposed) return;
      const s = store.settings;
      const aura = auraRef.value;
      const trail = trailRef.value;
      if (aura && trail) {
        // если файл не открыт (welcome поверх) — гасим эффекты и НЕ пишем стили
        const show = target.vis && !!store.activePath;
        if (show) {
          cur.x += (target.x - cur.x) * 0.22;
          cur.y += (target.y - cur.y) * 0.22;
          const t = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%)`;
          if (t !== lastT) {
            lastT = t;
            aura.style.transform = t;
            trail.style.transform = t;
          }
        }
        const auraOp = show ? (s.glow ? 0.3 + (s.glowIntensity / 100) * 0.7 : 0) : 0;
        const trailOp = show ? (s.trail ? 0.35 + (s.trailIntensity / 100) * 0.6 : 0) : 0;
        // пишем opacity ТОЛЬКО при изменении — меньше layout-работы для WebKit
        if (auraOp !== lastAuraOp) {
          lastAuraOp = auraOp;
          aura.style.opacity = String(auraOp);
        }
        if (trailOp !== lastTrailOp) {
          lastTrailOp = trailOp;
          trail.style.opacity = String(trailOp);
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  const waitForEditor = () => {
    if (disposed) return;
    const ed = getMonacoEditor();
    if (ed) {
      start(ed);
      return;
    }
    raf = requestAnimationFrame(waitForEditor);
  };
  raf = requestAnimationFrame(waitForEditor);
});

onUnmounted(() => {
  disposed = true;
  cancelAnimationFrame(raf);
  listeners.forEach((l) => l.dispose());
});
</script>

<template>
  <div class="cursor-fx">
    <div ref="auraRef" class="fx-aura" />
    <div ref="trailRef" class="fx-trail" />
    <div ref="sparksRef" class="fx-sparks" />
  </div>
</template>
