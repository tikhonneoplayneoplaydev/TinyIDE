// ─── Абсолютная кастомизация через tinyide.toml ───────────────────────────
// Файл конфигурации лежит в корне рабочей папки. Парсится (smol-toml) и
// применяется при сохранении / открытии папки / ручном перечитывании.

import { parse } from 'smol-toml';
import type { AccentKey, Settings, ShellId, TaskCommands } from '../types';
import { ACCENT_PRESETS } from '../types';

export const CONFIG_FILENAME = 'tinyide.toml';

export const DEFAULT_CONFIG_TOML = `# ═══════════════════════════════════════════════════════
#  TinyIDE — конфигурация (абсолютная кастомизация)
#  Меняй значения, сохраняй файл (Ctrl+S) — и они применятся.
# ═══════════════════════════════════════════════════════

[appearance]
theme = "dark"        # "dark" | "light"
accent = "cyan"       # "cyan" | "violet" | "pink" | "green" | "amber" | "red"

[editor]
font_family = "ui-monospace, 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace"
font_size = 14
font_ligatures = true
line_height = 1.5
tab_size = 4
insert_spaces = true
word_wrap = "off"     # "off" | "on"
minimap = true
cursor_style = "line" # "line" | "line-thin" | "block" | "underline" | "block-outline"
cursor_blinking = "smooth" # "blink" | "smooth" | "phase" | "expand" | "solid"
cursor_width = 2
smooth_caret = true
mouse_wheel_zoom = true
auto_closing_brackets = true
quick_suggestions = true
bracket_pair_colorization = true
indent_guides = true
render_line_highlight = "all" # "all" | "line" | "none"
sticky_scroll = false
padding_y = 14

[effects]
trail = true
trail_intensity = 80   # %
glow = true
glow_intensity = 60    # %
particles = true
particles_intensity = 70  # %

[files]
show_hidden = false

[terminal]
shell = "shell"       # "shell" | "nu" | "pwsh" | "cmd" | "zsh" | "fish"
font_size = 13
scrollback = 5000

# Команды для панели «Задачи» (▶)
[commands]
build = "npm run build"
run = "npm run dev"
test = "npm test"
`;

export type ConfigResult =
  | { patch: Partial<Settings>; commands: TaskCommands; error?: undefined }
  | { error: string; patch?: undefined; commands?: undefined };

function num(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : undefined;
}
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;
const bool = (v: unknown): boolean | undefined =>
  typeof v === 'boolean' ? v : undefined;

export function configToSettings(text: string): ConfigResult {
  let cfg: Record<string, any>;
  try {
    cfg = parse(text) as Record<string, any>;
  } catch (e: any) {
    return { error: (e?.message ?? String(e)).slice(0, 300) };
  }
  const patch: Partial<Settings> = {};
  const editor = (cfg.editor ?? {}) as Record<string, unknown>;
  const appr = (cfg.appearance ?? {}) as Record<string, unknown>;
  const eff = (cfg.effects ?? {}) as Record<string, unknown>;
  const files = (cfg.files ?? {}) as Record<string, unknown>;
  const term = (cfg.terminal ?? {}) as Record<string, unknown>;

  // editor
  const ff = str(editor.font_family);
  if (ff) patch.fontFamily = ff;
  const fs = num(editor.font_size, 8, 40);
  if (fs !== undefined) patch.fontSize = fs;
  const fl = bool(editor.font_ligatures);
  if (fl !== undefined) patch.fontLigatures = fl;
  const lh = num(editor.line_height, 1, 2.6);
  if (lh !== undefined) patch.lineHeight = lh;
  const ts = num(editor.tab_size, 1, 16);
  if (ts !== undefined) patch.tabSize = ts;
  const isp = bool(editor.insert_spaces);
  if (isp !== undefined) patch.insertSpaces = isp;
  if (editor.word_wrap === 'on' || editor.word_wrap === 'off')
    patch.wordWrap = editor.word_wrap;
  const mm = bool(editor.minimap);
  if (mm !== undefined) patch.minimap = mm;
  if (['line', 'line-thin', 'block', 'underline', 'block-outline'].includes(String(editor.cursor_style)))
    patch.cursorStyle = String(editor.cursor_style) as Settings['cursorStyle'];
  if (['blink', 'smooth', 'phase', 'expand', 'solid'].includes(String(editor.cursor_blinking)))
    patch.cursorBlinking = String(editor.cursor_blinking) as Settings['cursorBlinking'];
  const cw = num(editor.cursor_width, 1, 6);
  if (cw !== undefined) patch.cursorWidth = cw;
  const sc = bool(editor.smooth_caret);
  if (sc !== undefined) patch.smoothCaret = sc;
  const mwz = bool(editor.mouse_wheel_zoom);
  if (mwz !== undefined) patch.mouseWheelZoom = mwz;
  const acb = bool(editor.auto_closing_brackets);
  if (acb !== undefined) patch.autoClosingBrackets = acb;
  const qs = bool(editor.quick_suggestions);
  if (qs !== undefined) patch.quickSuggestions = qs;
  const bpc = bool(editor.bracket_pair_colorization);
  if (bpc !== undefined) patch.bracketPairColorization = bpc;
  const ig = bool(editor.indent_guides);
  if (ig !== undefined) patch.indentGuides = ig;
  if (['all', 'line', 'none'].includes(String(editor.render_line_highlight)))
    patch.renderLineHighlight = String(editor.render_line_highlight) as Settings['renderLineHighlight'];
  const ss = bool(editor.sticky_scroll);
  if (ss !== undefined) patch.stickyScroll = ss;
  const py = num(editor.padding_y, 0, 80);
  if (py !== undefined) patch.paddingY = py;

  // appearance
  if (appr.theme === 'dark' || appr.theme === 'light') patch.theme = appr.theme;
  const ac = str(appr.accent) as AccentKey | undefined;
  if (ac && ACCENT_PRESETS[ac]) patch.accent = ac;

  // effects
  const tr = bool(eff.trail);
  if (tr !== undefined) patch.trail = tr;
  const ti = num(eff.trail_intensity, 10, 100);
  if (ti !== undefined) patch.trailIntensity = ti;
  const gl = bool(eff.glow);
  if (gl !== undefined) patch.glow = gl;
  const gi = num(eff.glow_intensity, 10, 100);
  if (gi !== undefined) patch.glowIntensity = gi;
  const pa = bool(eff.particles);
  if (pa !== undefined) patch.particles = pa;
  const pi = num(eff.particles_intensity, 10, 100);
  if (pi !== undefined) patch.particlesIntensity = pi;

  // files
  const sh = bool(files.show_hidden);
  if (sh !== undefined) patch.showHidden = sh;

  // terminal
  if (['shell', 'nu', 'pwsh', 'cmd', 'zsh', 'fish'].includes(String(term.shell)))
    patch.shell = String(term.shell) as ShellId;
  const tfs = num(term.font_size, 8, 24);
  if (tfs !== undefined) patch.terminalFontSize = tfs;

  // commands
  const commands: TaskCommands = {};
  const rawCmds = (cfg.commands ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(rawCmds)) {
    const v = str(rawCmds[k]);
    if (v) commands[k] = v;
  }

  return { patch, commands };
}
