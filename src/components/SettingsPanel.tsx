import type { IdeApi, Settings } from '../types';
import { ACCENT_PRESETS, FONT_PRESETS, SHELLS } from '../types';
import { CONFIG_FILENAME } from '../config/tomlConfig';

const DEFAULTS: Settings = {
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
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">{title}</div>
      {children}
    </div>
  );
}

function Toggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <button className={`switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)} aria-pressed={value}>
        <span className="switch-knob" />
      </button>
    </div>
  );
}

function Range({
  label, value, min, max, step = 1, onChange, suffix = '',
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="setting-row">
      <span>{label} — {value}{suffix}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)} className="range"
      />
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

function Select({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsPanel({ ide }: { ide: IdeApi }) {
  const s = ide.settings;
  const set = (patch: Partial<Settings>) => ide.updateSettings(patch);

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <span className="panel-title">Settings</span>
      </div>
      <div className="settings-scroll">
        <Section title="🎨 Тема и акцент">
          <div className="setting-row">
            <span>Тема</span>
            <Segmented
              options={[{ v: 'dark' as const, l: '🌙 Тёмная' }, { v: 'light' as const, l: '☀️ Светлая' }]}
              value={s.theme}
              onPick={(v) => set({ theme: v })}
            />
          </div>
          <div className="setting-row">
            <span>Акцентный цвет</span>
            <div className="accent-row">
              {(Object.keys(ACCENT_PRESETS) as (keyof typeof ACCENT_PRESETS)[]).map((k) => {
                const a = ACCENT_PRESETS[k];
                return (
                  <button
                    key={k}
                    className={`accent-dot ${s.accent === k ? 'on' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${a.c1}, ${a.c3})` }}
                    title={a.label}
                    onClick={() => set({ accent: k })}
                    aria-label={a.label}
                  />
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="✍️ Шрифт">
          <Select
            label="Семейство шрифта"
            value={s.fontFamily}
            options={FONT_PRESETS.map((f) => ({ v: f.id, l: f.label }))}
            onChange={(v) => set({ fontFamily: v })}
          />
          <Range label="Размер шрифта" value={s.fontSize} min={10} max={28} onChange={(v) => set({ fontSize: v })} suffix="px" />
          <Range label="Высота строки" value={s.lineHeight} min={1} max={2.2} step={0.1} onChange={(v) => set({ lineHeight: v })} />
          <Toggle label="Лигатуры (>=<->)" value={s.fontLigatures} onChange={(v) => set({ fontLigatures: v })} />
        </Section>

        <Section title="📝 Редактор">
          <div className="setting-row">
            <span>Размер табуляции</span>
            <Segmented
              options={[{ v: 2, l: '2' }, { v: 4, l: '4' }, { v: 8, l: '8' }]}
              value={s.tabSize}
              onPick={(v) => set({ tabSize: v })}
            />
          </div>
          <Toggle label="Пробелы вместо табов" value={s.insertSpaces} onChange={(v) => set({ insertSpaces: v })} />
          <Toggle label="Перенос строк" value={s.wordWrap === 'on'} onChange={(v) => set({ wordWrap: v ? 'on' : 'off' })} />
          <Toggle label="Миникарта" value={s.minimap} onChange={(v) => set({ minimap: v })} />
          <Toggle label="Автозакрытие скобок" value={s.autoClosingBrackets} onChange={(v) => set({ autoClosingBrackets: v })} />
          <Toggle label="Автодополнение" value={s.quickSuggestions} onChange={(v) => set({ quickSuggestions: v })} />
          <Toggle label="Цветные парные скобки" value={s.bracketPairColorization} onChange={(v) => set({ bracketPairColorization: v })} />
          <Toggle label="Направляющие отступов" value={s.indentGuides} onChange={(v) => set({ indentGuides: v })} />
          <Toggle label="Прилипающий скролл" value={s.stickyScroll} onChange={(v) => set({ stickyScroll: v })} />
          <Toggle label="Зум колёсиком мыши" value={s.mouseWheelZoom} onChange={(v) => set({ mouseWheelZoom: v })} />
          <Select
            label="Подсветка строки"
            value={s.renderLineHighlight}
            options={[{ v: 'all', l: 'Вся строка' }, { v: 'line', l: 'Только линия' }, { v: 'none', l: 'Выкл' }]}
            onChange={(v) => set({ renderLineHighlight: v as Settings['renderLineHighlight'] })}
          />
          <Range label="Отступы по краям" value={s.paddingY} min={0} max={40} onChange={(v) => set({ paddingY: v })} suffix="px" />
        </Section>

        <Section title="✏️ Курсор">
          <Select
            label="Стиль курсора"
            value={s.cursorStyle}
            options={[
              { v: 'line', l: 'line' }, { v: 'line-thin', l: 'line-thin' },
              { v: 'block', l: 'block' }, { v: 'underline', l: 'underline' },
              { v: 'block-outline', l: 'block-outline' },
            ]}
            onChange={(v) => set({ cursorStyle: v as Settings['cursorStyle'] })}
          />
          <Select
            label="Мигание"
            value={s.cursorBlinking}
            options={[
              { v: 'smooth', l: 'smooth' }, { v: 'blink', l: 'blink' },
              { v: 'phase', l: 'phase' }, { v: 'expand', l: 'expand' },
              { v: 'solid', l: 'solid' },
            ]}
            onChange={(v) => set({ cursorBlinking: v as Settings['cursorBlinking'] })}
          />
          <Range label="Ширина курсора" value={s.cursorWidth} min={1} max={4} onChange={(v) => set({ cursorWidth: v })} suffix="px" />
          <Toggle label="Плавное движение курсора" value={s.smoothCaret} onChange={(v) => set({ smoothCaret: v })} />
        </Section>

        <Section title="🚀 Эффекты кометы">
          <Toggle label="Кометный шлейф" value={s.trail} onChange={(v) => set({ trail: v })} />
          {s.trail && (
            <Range label="Длина шлейфа" value={s.trailIntensity} min={10} max={100} onChange={(v) => set({ trailIntensity: v })} suffix="%" />
          )}
          <Toggle label="Свечение вокруг курсора" value={s.glow} onChange={(v) => set({ glow: v })} />
          {s.glow && (
            <Range label="Яркость свечения" value={s.glowIntensity} min={10} max={100} onChange={(v) => set({ glowIntensity: v })} suffix="%" />
          )}
          <Toggle label="Искры при наборе" value={s.particles} onChange={(v) => set({ particles: v })} />
          {s.particles && (
            <Range label="Количество искр" value={s.particlesIntensity} min={10} max={100} onChange={(v) => set({ particlesIntensity: v })} suffix="%" />
          )}
        </Section>

        <Section title="💻 Терминал">
          <div className="setting-row">
            <span>Оболочка</span>
            <select
              className="select"
              value={s.shell}
              onChange={(e) => set({ shell: e.target.value as Settings['shell'] })}
            >
              {SHELLS.map((sh) => (
                <option key={sh.id} value={sh.id}>{sh.label}</option>
              ))}
            </select>
          </div>
          <Range
            label="Размер шрифта"
            value={s.terminalFontSize}
            min={8}
            max={24}
            onChange={(v) => set({ terminalFontSize: v })}
            suffix="px"
          />
        </Section>

        <Section title="⚙️ Конфигурация (tinyide.toml)">
          <div className="config-note">
            Все настройки можно задать файлом <code>{CONFIG_FILENAME}</code> в корне проекта:
            тема, акцент, шрифт, эффекты, терминал и команды задач.
          </div>
          <button className="btn ghost config-btn" onClick={() => ide.openConfigFile()}>
            📄 Открыть {CONFIG_FILENAME}
          </button>
          <button className="btn ghost config-btn" onClick={() => ide.reloadConfig()}>
            🔄 Перечитать конфигурацию
          </button>
        </Section>

        <Section title="📂 Файлы">
          <Toggle
            label="Показывать скрытые файлы"
            value={s.showHidden}
            onChange={(v) => {
              set({ showHidden: v });
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
        <div className="settings-about">TinyIDE v0.3.0 — Tauri 2 · React 18 · Monaco · AGPL-3.0</div>
      </div>
    </div>
  );
}
