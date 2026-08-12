import type { IdeApi, Settings } from '../types';

const DEFAULTS: Settings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 4,
  wordWrap: 'off',
  minimap: true,
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  trail: true,
  glow: true,
  particles: true,
  showHidden: false,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <button
        className={`switch ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

function Segmented<T extends string | number>({
  options, value, onPick,
}: {
  options: { v: T; l: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={String(o.v)} className={o.v === value ? 'on' : ''} onClick={() => onPick(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPanel({ ide }: { ide: IdeApi }) {
  const s = ide.settings;
  return (
    <div className="settings-panel">
      <div className="panel-header">
        <span className="panel-title">Settings</span>
      </div>
      <div className="settings-scroll">
        <Section title="Редактор">
          <div className="setting-row">
            <span>Размер шрифта — {s.fontSize}px</span>
            <input
              type="range"
              min={10}
              max={24}
              value={s.fontSize}
              onChange={(e) => ide.updateSettings({ fontSize: +e.target.value })}
              className="range"
            />
          </div>
          <div className="setting-row">
            <span>Размер табуляции</span>
            <Segmented
              options={[{ v: 2, l: '2' }, { v: 4, l: '4' }, { v: 8, l: '8' }]}
              value={s.tabSize}
              onPick={(v) => ide.updateSettings({ tabSize: v })}
            />
          </div>
          <Toggle
            label="Перенос строк"
            value={s.wordWrap === 'on'}
            onChange={(v) => ide.updateSettings({ wordWrap: v ? 'on' : 'off' })}
          />
          <Toggle label="Миникарта" value={s.minimap} onChange={(v) => ide.updateSettings({ minimap: v })} />
        </Section>

        <Section title="Курсор-комета">
          <div className="setting-row">
            <span>Стиль курсора</span>
            <select
              className="select"
              value={s.cursorStyle}
              onChange={(e) => ide.updateSettings({ cursorStyle: e.target.value as Settings['cursorStyle'] })}
            >
              <option value="line">line</option>
              <option value="line-thin">line-thin</option>
              <option value="block">block</option>
              <option value="underline">underline</option>
              <option value="block-outline">block-outline</option>
            </select>
          </div>
          <div className="setting-row">
            <span>Мигание</span>
            <select
              className="select"
              value={s.cursorBlinking}
              onChange={(e) => ide.updateSettings({ cursorBlinking: e.target.value as Settings['cursorBlinking'] })}
            >
              <option value="smooth">smooth</option>
              <option value="blink">blink</option>
              <option value="phase">phase</option>
              <option value="expand">expand</option>
              <option value="solid">solid</option>
            </select>
          </div>
          <Toggle label="Кометный шлейф" value={s.trail} onChange={(v) => ide.updateSettings({ trail: v })} />
          <Toggle label="Свечение вокруг курсора" value={s.glow} onChange={(v) => ide.updateSettings({ glow: v })} />
          <Toggle label="Искры при наборе" value={s.particles} onChange={(v) => ide.updateSettings({ particles: v })} />
        </Section>

        <Section title="Оформление">
          <div className="setting-row">
            <span>Тема</span>
            <Segmented
              options={[{ v: 'dark' as const, l: '🌙 Тёмная' }, { v: 'light' as const, l: '☀️ Светлая' }]}
              value={s.theme}
              onPick={(v) => ide.updateSettings({ theme: v })}
            />
          </div>
          <Toggle
            label="Показывать скрытые файлы"
            value={s.showHidden}
            onChange={(v) => {
              ide.updateSettings({ showHidden: v });
              ide.refreshTree();
            }}
          />
        </Section>

        <button
          className="btn ghost settings-reset"
          onClick={() => {
            ide.updateSettings(DEFAULTS);
            ide.toast('Настройки сброшены');
          }}
        >
          Сбросить настройки
        </button>
        <div className="settings-about">TinyIDE v0.1.0 — Tauri 2 · React 18 · Monaco · GPL-3.0</div>
      </div>
    </div>
  );
}
