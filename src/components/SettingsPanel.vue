<script setup lang="ts">
import { store } from '../store';
import { ACCENT_PRESETS, FONT_PRESETS } from '../types';
import type { Settings } from '../types';
import { CONFIG_FILENAME } from '../config/tomlConfig';
import ShellSelector from './ShellSelector.vue';
import { LANGS } from '../i18n';

const s = () => store.settings;
const set = (patch: Partial<Settings>) => store.updateSettings(patch);

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: 'cyan',
  fontFamily: FONT_PRESETS[0].id,
  fontSize: 14,
  fontLigatures: true,
  lineHeight: 1.5,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'off',
  minimap: true,
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  cursorWidth: 2,
  smoothCaret: true,
  mouseWheelZoom: true,
  autoClosingBrackets: true,
  quickSuggestions: true,
  bracketPairColorization: true,
  indentGuides: true,
  renderLineHighlight: 'all',
  stickyScroll: false,
  breadcrumbs: true,
  paddingY: 14,
  trail: true,
  trailIntensity: 80,
  glow: true,
  glowIntensity: 60,
  particles: true,
  particlesIntensity: 70,
  showHidden: false,
  shell: 'shell',
  terminalFontSize: 13,
  customShells: [],
};

const reset = () => {
  store.updateSettings(DEFAULT_SETTINGS);
  store.toast('Настройки сброшены');
};
</script>

<template>
  <div class="settings-panel">
    <div class="panel-header"><span class="panel-title">Settings</span></div>
    <div class="settings-scroll">
      <div class="settings-section">
        <div class="settings-section-title">🌐 {{ store.t('settings.interface') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.lang') }}</span>
          <select class="select" :value="s().lang" @change="(e) => set({ lang: (e.target as HTMLSelectElement).value as never })">
            <option v-for="l in LANGS" :key="l.id" :value="l.id">{{ l.flag }} {{ l.label }}</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🎨 {{ store.t('settings.theme') }} и {{ store.t('settings.accent').toLowerCase() }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.theme') }}</span>
          <div class="segmented">
            <button :class="{ on: s().theme === 'dark' }" @click="set({ theme: 'dark' })">{{ store.t('settings.dark') }}</button>
            <button :class="{ on: s().theme === 'light' }" @click="set({ theme: 'light' })">{{ store.t('settings.light') }}</button>
          </div>
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.accent') }}</span>
          <div class="accent-row">
            <button
              v-for="(a, k) in ACCENT_PRESETS"
              :key="k"
              class="accent-dot"
              :class="{ on: s().accent === k }"
              :style="{ background: `linear-gradient(135deg, ${a.c1}, ${a.c3})` }"
              :title="a.label"
              @click="set({ accent: k as Settings['accent'] })"
            />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.font') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.fontFamily') }}</span>
          <select class="select" :value="s().fontFamily" @change="(e) => set({ fontFamily: (e.target as HTMLSelectElement).value })">
            <option v-for="f in FONT_PRESETS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.fontSize') }} — {{ s().fontSize }}px</span>
          <input type="range" min="10" max="28" :value="s().fontSize" class="range" @input="(e) => set({ fontSize: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.lineHeight') }} — {{ s().lineHeight }}</span>
          <input type="range" min="1" max="2.2" step="0.1" :value="s().lineHeight" class="range" @input="(e) => set({ lineHeight: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.ligatures') }}</span>
          <button class="switch" :class="{ on: s().fontLigatures }" @click="set({ fontLigatures: !s().fontLigatures })">
            <span class="switch-knob" />
          </button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.editor') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.tabSize') }}</span>
          <div class="segmented">
            <button v-for="t in [2, 4, 8]" :key="t" :class="{ on: s().tabSize === t }" @click="set({ tabSize: t })">{{ t }}</button>
          </div>
        </div>
        <div v-for="(toggle, key) in [
          { label: store.t('settings.spaces'), key: 'insertSpaces' },
          { label: store.t('settings.wrap'), key: 'wordWrapOn' },
          { label: store.t('settings.minimap'), key: 'minimap' },
          { label: store.t('settings.autoBrackets'), key: 'autoClosingBrackets' },
          { label: store.t('settings.suggestions'), key: 'quickSuggestions' },
          { label: store.t('settings.colorBrackets'), key: 'bracketPairColorization' },
          { label: store.t('settings.indentGuides'), key: 'indentGuides' },
          { label: store.t('settings.stickyScroll'), key: 'stickyScroll' },
          { label: store.t('settings.breadcrumbs'), key: 'breadcrumbs' },
          { label: store.t('settings.mouseZoom'), key: 'mouseWheelZoom' },
        ]" :key="key" class="setting-row">
          <span>{{ toggle.label }}</span>
          <button class="switch" :class="{ on: (s() as any)[toggle.key] }" @click="set({ [toggle.key]: !(s() as any)[toggle.key] } as any)">
            <span class="switch-knob" />
          </button>
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.lineHighlight') }}</span>
          <select class="select" :value="s().renderLineHighlight" @change="(e) => set({ renderLineHighlight: (e.target as HTMLSelectElement).value as Settings['renderLineHighlight'] })">
            <option value="all">{{ store.t('settings.all') }}</option>
            <option value="line">{{ store.t('settings.lineOnly') }}</option>
            <option value="none">{{ store.t('settings.off') }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.padding') }} — {{ s().paddingY }}px</span>
          <input type="range" min="0" max="40" :value="s().paddingY" class="range" @input="(e) => set({ paddingY: +(e.target as HTMLInputElement).value })" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.cursor') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.cursorStyle') }}</span>
          <select class="select" :value="s().cursorStyle" @change="(e) => set({ cursorStyle: (e.target as HTMLSelectElement).value as Settings['cursorStyle'] })">
            <option v-for="o in ['line', 'line-thin', 'block', 'underline', 'block-outline']" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.blinking') }}</span>
          <select class="select" :value="s().cursorBlinking" @change="(e) => set({ cursorBlinking: (e.target as HTMLSelectElement).value as Settings['cursorBlinking'] })">
            <option v-for="o in ['smooth', 'blink', 'phase', 'expand', 'solid']" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.cursorWidth') }} — {{ s().cursorWidth }}px</span>
          <input type="range" min="1" max="4" :value="s().cursorWidth" class="range" @input="(e) => set({ cursorWidth: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.smoothCaret') }}</span>
          <button class="switch" :class="{ on: s().smoothCaret }" @click="set({ smoothCaret: !s().smoothCaret })">
            <span class="switch-knob" />
          </button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.effects') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.trail') }}</span>
          <button class="switch" :class="{ on: s().trail }" @click="set({ trail: !s().trail })">
            <span class="switch-knob" />
          </button>
        </div>
        <div v-if="s().trail" class="setting-row">
          <span>{{ store.t('settings.trailLen') }} — {{ s().trailIntensity }}%</span>
          <input type="range" min="10" max="100" :value="s().trailIntensity" class="range" @input="(e) => set({ trailIntensity: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.glow') }}</span>
          <button class="switch" :class="{ on: s().glow }" @click="set({ glow: !s().glow })">
            <span class="switch-knob" />
          </button>
        </div>
        <div v-if="s().glow" class="setting-row">
          <span>{{ store.t('settings.glowBright') }} — {{ s().glowIntensity }}%</span>
          <input type="range" min="10" max="100" :value="s().glowIntensity" class="range" @input="(e) => set({ glowIntensity: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.sparks') }}</span>
          <button class="switch" :class="{ on: s().particles }" @click="set({ particles: !s().particles })">
            <span class="switch-knob" />
          </button>
        </div>
        <div v-if="s().particles" class="setting-row">
          <span>{{ store.t('settings.sparkCount') }} — {{ s().particlesIntensity }}%</span>
          <input type="range" min="10" max="100" :value="s().particlesIntensity" class="range" @input="(e) => set({ particlesIntensity: +(e.target as HTMLInputElement).value })" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.terminal') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.shell') }}</span>
          <ShellSelector :model-value="s().shell" @update:model-value="(v) => set({ shell: v })" />
        </div>
        <div class="setting-row">
          <span>{{ store.t('settings.termFont') }} — {{ s().terminalFontSize }}px</span>
          <input type="range" min="8" max="24" :value="s().terminalFontSize" class="range" @input="(e) => set({ terminalFontSize: +(e.target as HTMLInputElement).value })" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.config') }}</div>
        <div class="config-note">
          {{ store.t('settings.configNote') }}
        </div>
        <button class="btn ghost config-btn" @click="store.openConfigFile()">{{ store.t('settings.openConfig') }}</button>
        <button class="btn ghost config-btn" @click="store.reloadConfig()">{{ store.t('settings.reloadConfig') }}</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">{{ store.t('settings.files') }}</div>
        <div class="setting-row">
          <span>{{ store.t('settings.showHidden') }}</span>
          <button class="switch" :class="{ on: s().showHidden }" @click="set({ showHidden: !s().showHidden }); store.refreshTree()">
            <span class="switch-knob" />
          </button>
        </div>
      </div>

      <button class="btn ghost settings-reset" @click="reset"> {{ store.t('settings.reset') }}</button>
      <div class="settings-about">{{ store.t('settings.about') }}</div>
    </div>
  </div>
</template>
