<script setup lang="ts">
import { store } from '../store';
import { ACCENT_PRESETS, FONT_PRESETS } from '../types';
import type { Settings } from '../types';
import { CONFIG_FILENAME } from '../config/tomlConfig';
import ShellSelector from './ShellSelector.vue';

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
        <div class="settings-section-title">🎨 Тема и акцент</div>
        <div class="setting-row">
          <span>Тема</span>
          <div class="segmented">
            <button :class="{ on: s().theme === 'dark' }" @click="set({ theme: 'dark' })">🌙 Тёмная</button>
            <button :class="{ on: s().theme === 'light' }" @click="set({ theme: 'light' })">☀️ Светлая</button>
          </div>
        </div>
        <div class="setting-row">
          <span>Акцентный цвет</span>
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
        <div class="settings-section-title">✍️ Шрифт</div>
        <div class="setting-row">
          <span>Семейство шрифта</span>
          <select class="select" :value="s().fontFamily" @change="(e) => set({ fontFamily: (e.target as HTMLSelectElement).value })">
            <option v-for="f in FONT_PRESETS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>Размер шрифта — {{ s().fontSize }}px</span>
          <input type="range" min="10" max="28" :value="s().fontSize" class="range" @input="(e) => set({ fontSize: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>Высота строки — {{ s().lineHeight }}</span>
          <input type="range" min="1" max="2.2" step="0.1" :value="s().lineHeight" class="range" @input="(e) => set({ lineHeight: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>Лигатуры (>=&lt;-&gt;)</span>
          <button class="switch" :class="{ on: s().fontLigatures }" @click="set({ fontLigatures: !s().fontLigatures })">
            <span class="switch-knob" />
          </button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📝 Редактор</div>
        <div class="setting-row">
          <span>Размер табуляции</span>
          <div class="segmented">
            <button v-for="t in [2, 4, 8]" :key="t" :class="{ on: s().tabSize === t }" @click="set({ tabSize: t })">{{ t }}</button>
          </div>
        </div>
        <div v-for="(toggle, key) in [
          { label: 'Пробелы вместо табов', key: 'insertSpaces' },
          { label: 'Перенос строк', key: 'wordWrapOn' },
          { label: 'Миникарта', key: 'minimap' },
          { label: 'Автозакрытие скобок', key: 'autoClosingBrackets' },
          { label: 'Автодополнение', key: 'quickSuggestions' },
          { label: 'Цветные парные скобки', key: 'bracketPairColorization' },
          { label: 'Направляющие отступов', key: 'indentGuides' },
          { label: 'Прилипающий скролл', key: 'stickyScroll' },
          { label: 'Зум колёсиком мыши', key: 'mouseWheelZoom' },
        ]" :key="key" class="setting-row">
          <span>{{ toggle.label }}</span>
          <button class="switch" :class="{ on: (s() as any)[toggle.key] }" @click="set({ [toggle.key]: !(s() as any)[toggle.key] } as any)">
            <span class="switch-knob" />
          </button>
        </div>
        <div class="setting-row">
          <span>Подсветка строки</span>
          <select class="select" :value="s().renderLineHighlight" @change="(e) => set({ renderLineHighlight: (e.target as HTMLSelectElement).value as Settings['renderLineHighlight'] })">
            <option value="all">Вся строка</option>
            <option value="line">Только линия</option>
            <option value="none">Выкл</option>
          </select>
        </div>
        <div class="setting-row">
          <span>Отступы по краям — {{ s().paddingY }}px</span>
          <input type="range" min="0" max="40" :value="s().paddingY" class="range" @input="(e) => set({ paddingY: +(e.target as HTMLInputElement).value })" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">✏️ Курсор</div>
        <div class="setting-row">
          <span>Стиль курсора</span>
          <select class="select" :value="s().cursorStyle" @change="(e) => set({ cursorStyle: (e.target as HTMLSelectElement).value as Settings['cursorStyle'] })">
            <option v-for="o in ['line', 'line-thin', 'block', 'underline', 'block-outline']" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>Мигание</span>
          <select class="select" :value="s().cursorBlinking" @change="(e) => set({ cursorBlinking: (e.target as HTMLSelectElement).value as Settings['cursorBlinking'] })">
            <option v-for="o in ['smooth', 'blink', 'phase', 'expand', 'solid']" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>Ширина курсора — {{ s().cursorWidth }}px</span>
          <input type="range" min="1" max="4" :value="s().cursorWidth" class="range" @input="(e) => set({ cursorWidth: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>Плавное движение курсора</span>
          <button class="switch" :class="{ on: s().smoothCaret }" @click="set({ smoothCaret: !s().smoothCaret })">
            <span class="switch-knob" />
          </button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🚀 Эффекты кометы</div>
        <div class="setting-row">
          <span>Кометный шлейф</span>
          <button class="switch" :class="{ on: s().trail }" @click="set({ trail: !s().trail })">
            <span class="switch-knob" />
          </button>
        </div>
        <div v-if="s().trail" class="setting-row">
          <span>Длина шлейфа — {{ s().trailIntensity }}%</span>
          <input type="range" min="10" max="100" :value="s().trailIntensity" class="range" @input="(e) => set({ trailIntensity: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>Свечение вокруг курсора</span>
          <button class="switch" :class="{ on: s().glow }" @click="set({ glow: !s().glow })">
            <span class="switch-knob" />
          </button>
        </div>
        <div v-if="s().glow" class="setting-row">
          <span>Яркость свечения — {{ s().glowIntensity }}%</span>
          <input type="range" min="10" max="100" :value="s().glowIntensity" class="range" @input="(e) => set({ glowIntensity: +(e.target as HTMLInputElement).value })" />
        </div>
        <div class="setting-row">
          <span>Искры при наборе</span>
          <button class="switch" :class="{ on: s().particles }" @click="set({ particles: !s().particles })">
            <span class="switch-knob" />
          </button>
        </div>
        <div v-if="s().particles" class="setting-row">
          <span>Количество искр — {{ s().particlesIntensity }}%</span>
          <input type="range" min="10" max="100" :value="s().particlesIntensity" class="range" @input="(e) => set({ particlesIntensity: +(e.target as HTMLInputElement).value })" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">💻 Терминал</div>
        <div class="setting-row">
          <span>Оболочка</span>
          <ShellSelector :model-value="s().shell" @update:model-value="(v) => set({ shell: v })" />
        </div>
        <div class="setting-row">
          <span>Размер шрифта — {{ s().terminalFontSize }}px</span>
          <input type="range" min="8" max="24" :value="s().terminalFontSize" class="range" @input="(e) => set({ terminalFontSize: +(e.target as HTMLInputElement).value })" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">⚙️ Конфигурация (tinyide.toml)</div>
        <div class="config-note">
          Все настройки можно задать файлом <code>{{ CONFIG_FILENAME }}</code> в корне проекта:
          тема, акцент, шрифт, эффекты, терминал и команды задач.
        </div>
        <button class="btn ghost config-btn" @click="store.openConfigFile()">📄 Открыть {{ CONFIG_FILENAME }}</button>
        <button class="btn ghost config-btn" @click="store.reloadConfig()">🔄 Перечитать конфигурацию</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📂 Файлы</div>
        <div class="setting-row">
          <span>Показывать скрытые файлы</span>
          <button class="switch" :class="{ on: s().showHidden }" @click="set({ showHidden: !s().showHidden }); store.refreshTree()">
            <span class="switch-knob" />
          </button>
        </div>
      </div>

      <button class="btn ghost settings-reset" @click="reset">Сбросить настройки</button>
      <div class="settings-about">TinyIDE v0.5.0 — Tauri 2 · Vue 3 · Monaco · AGPL-3.0</div>
    </div>
  </div>
</template>
