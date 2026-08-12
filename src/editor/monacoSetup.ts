// ─── Monaco bootstrap: workers, themes, language detection ─────────────────
// Modular ESM imports (like VS Code itself): core api + editor features +
// basic languages + advanced language services. Much lighter than the
// full editor.main bundle.

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/html/monaco.contribution';
import 'monaco-editor/min/vs/editor/editor.main.css';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

// ─── Themes ─────────────────────────────────────────────────────────────────

monaco.editor.defineTheme('comet-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5b6a8c', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff8ac2' },
    { token: 'keyword.control', foreground: 'ff8ac2' },
    { token: 'string', foreground: 'a3e88a' },
    { token: 'string.escape', foreground: 'ffd580' },
    { token: 'number', foreground: 'ffb86c' },
    { token: 'type', foreground: '7aa2ff' },
    { token: 'type.identifier', foreground: '7aa2ff' },
    { token: 'identifier', foreground: 'd5e0f7' },
    { token: 'function', foreground: '82aaff' },
    { token: 'variable', foreground: 'e0e6ff' },
    { token: 'variable.parameter', foreground: 'e0e6ff' },
    { token: 'operator', foreground: '7ee0ff' },
    { token: 'delimiter', foreground: '8b98b8' },
    { token: 'punctuation', foreground: '8b98b8' },
    { token: 'tag', foreground: 'ff7b72' },
    { token: 'attribute.name', foreground: 'ffd580' },
    { token: 'attribute.value', foreground: 'a3e88a' },
    { token: 'constant', foreground: 'ff9e64' },
    { token: 'constant.language', foreground: 'ff9e64' },
    { token: 'regexp', foreground: 'ffd580' },
    { token: 'class', foreground: 'ffd580' },
    { token: 'namespace', foreground: 'ffd580' },
    { token: 'annotation', foreground: 'f472b6' },
    { token: 'predefined', foreground: '7aa2ff' },
    { token: 'macro', foreground: '7ee0ff' },
  ],
  colors: {
    'editor.background': '#0b0e17',
    'editor.foreground': '#d5e0f7',
    'editorCursor.foreground': '#67e8f9',
    'editor.lineHighlightBackground': '#121828',
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': '#2a4d7a66',
    'editor.inactiveSelectionBackground': '#1f3b5f44',
    'editor.selectionHighlightBackground': '#2a4d7a33',
    'editor.wordHighlightBackground': '#2a4d7a44',
    'editorLineNumber.foreground': '#3d4a6b',
    'editorLineNumber.activeForeground': '#8aa0d0',
    'editorIndentGuide.background1': '#1b2338',
    'editorIndentGuide.activeBackground1': '#2e3c61',
    'editorBracketMatch.background': '#233052',
    'editorBracketMatch.border': '#4a6cf7',
    'editorGutter.background': '#0b0e17',
    'editorWidget.background': '#10162b',
    'editorWidget.border': '#243052',
    'editorSuggestWidget.background': '#10162b',
    'editorSuggestWidget.border': '#243052',
    'editorSuggestWidget.selectedBackground': '#1d2a4d',
    'editorSuggestWidget.highlightForeground': '#67e8f9',
    'editorHoverWidget.background': '#10162b',
    'editorHoverWidget.border': '#243052',
    'editorLink.activeForeground': '#67e8f9',
    'editorWhitespace.foreground': '#1d2740',
    'scrollbarSlider.background': '#2a3555',
    'scrollbarSlider.hoverBackground': '#38456e',
    'scrollbarSlider.activeBackground': '#46547e',
    'editorOverviewRuler.border': '#00000000',
    'editorError.foreground': '#f87171',
    'editorWarning.foreground': '#fbbf24',
    'editorInfo.foreground': '#67e8f9',
    'input.background': '#0e1424',
    'input.border': '#243052',
    'input.foreground': '#d5e0f7',
    'focusBorder': '#3b82f6',
    'list.activeSelectionBackground': '#1b2b52',
    'list.hoverBackground': '#141d36',
    'list.focusBackground': '#1b2b52',
    'list.inactiveSelectionBackground': '#182240',
    'quickInput.background': '#10162b',
    'quickInput.foreground': '#d5e0f7',
    'quickInputList.focusBackground': '#1d2a4d',
    'button.background': '#2563eb',
    'button.hoverBackground': '#2f6ef0',
    'button.foreground': '#ffffff',
    'badge.background': '#1d2a4d',
    'badge.foreground': '#d5e0f7',
    'editor.findMatchBackground': '#3a5a9a55',
    'editor.findMatchHighlightBackground': '#3a5a9a33',
    'minimap.background': '#0b0e17',
  },
});

monaco.editor.defineTheme('comet-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '8a94ad', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'd6336c' },
    { token: 'string', foreground: '2f9e44' },
    { token: 'number', foreground: 'e8590c' },
    { token: 'type', foreground: '1c7ed6' },
    { token: 'function', foreground: '1971c2' },
    { token: 'operator', foreground: '0b7285' },
    { token: 'tag', foreground: 'd9480f' },
    { token: 'constant', foreground: 'e8590c' },
    { token: 'annotation', foreground: '7048e8' },
  ],
  colors: {
    'editor.background': '#f7f9fd',
    'editor.foreground': '#242b3f',
    'editorCursor.foreground': '#2563eb',
    'editor.lineHighlightBackground': '#e8eefb',
    'editor.selectionBackground': '#cfe0ff',
    'editor.inactiveSelectionBackground': '#dce8ff88',
    'editorLineNumber.foreground': '#9aa7c4',
    'editorLineNumber.activeForeground': '#33415e',
    'editorIndentGuide.background1': '#dfe6f2',
    'editorIndentGuide.activeBackground1': '#b6c2da',
    'editorWidget.background': '#ffffff',
    'editorWidget.border': '#d7ddee',
    'editorSuggestWidget.background': '#ffffff',
    'editorSuggestWidget.selectedBackground': '#dbe7ff',
    'editorHoverWidget.background': '#ffffff',
    'scrollbarSlider.background': '#c3cce2',
    'scrollbarSlider.hoverBackground': '#aab6d4',
    'input.background': '#ffffff',
    'input.border': '#d7ddee',
    'focusBorder': '#2563eb',
    'list.activeSelectionBackground': '#dbe7ff',
    'list.hoverBackground': '#eef2fa',
    'quickInput.background': '#ffffff',
    'button.background': '#2563eb',
    'button.foreground': '#ffffff',
  },
});

// ─── Language detection ─────────────────────────────────────────────────────

const LANG_BY_EXT: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python', pyw: 'python', rs: 'rust', go: 'go',
  c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', hpp: 'cpp', cxx: 'cpp',
  cs: 'csharp', java: 'java', rb: 'ruby', php: 'php', swift: 'swift',
  kt: 'kotlin', kts: 'kotlin', scala: 'scala', dart: 'dart', lua: 'lua',
  r: 'r', pl: 'perl', pm: 'perl', hs: 'haskell', ex: 'elixir', exs: 'elixir',
  erl: 'erlang', hrl: 'erlang', jl: 'julia', zig: 'zig', clj: 'clojure',
  cljs: 'clojure', fs: 'fsharp', fsx: 'fsharp', ml: 'ocaml', mli: 'ocaml',
  vue: 'html', svelte: 'html', html: 'html', htm: 'html', xhtml: 'html',
  css: 'css', scss: 'scss', sass: 'scss', less: 'less',
  json: 'json', jsonc: 'json', json5: 'json', yaml: 'yaml', yml: 'yaml',
  toml: 'ini', ini: 'ini', cfg: 'ini', xml: 'xml', svg: 'xml',
  md: 'markdown', markdown: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell',
  zsh: 'shell', fish: 'shell', ps1: 'powershell', psm1: 'powershell',
  bat: 'bat', cmd: 'bat', diff: 'diff', patch: 'diff', tex: 'latex',
  asm: 'asm', s: 'asm', v: 'verilog', sv: 'verilog', vhd: 'vhdl', vhdl: 'vhdl',
  graphql: 'graphql', gql: 'graphql', prisma: 'prisma',
  dockerfile: 'dockerfile', makefile: 'makefile', cmake: 'cmake',
  txt: 'plaintext', log: 'plaintext', csv: 'plaintext',
};

export function languageForPath(path: string): string {
  const base = (path.split('/').pop() || '').toUpperCase();
  const name = base.toLowerCase();
  if (base === 'DOCKERFILE' || base.startsWith('DOCKERFILE.')) return 'dockerfile';
  if (base === 'MAKEFILE' || base.endsWith('.MAKEFILE')) return 'makefile';
  if (base === 'CMAKE' || name.endsWith('.cmake')) return 'cmake';
  if (base === 'GEMFILE' || base === 'RAKEFILE') return 'ruby';
  if (base === 'PIPFILE' || base === 'REQUIREMENTS.TXT' || base === 'PYPROJECT.TOML') return 'python';
  if (base === 'CARGO.TOML' || base === 'CARGO.LOCK') return 'ini';
  if (base === 'PACKAGE.JSON' || base === 'TSCONFIG.JSON' || base === 'COMPOSER.JSON') return 'json';
  if (base === 'GRADLE' || base === 'BUILD.GRADLE') return 'groovy';
  if (base === '.GITIGNORE' || base === '.ENV' || base === '.EDITORCONFIG') return 'ini';
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  return LANG_BY_EXT[ext] || 'plaintext';
}

// ─── File-icon colors (like VS Code language colors) ────────────────────────

export const EXT_COLORS: Record<string, string> = {
  js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#519aba',
  py: '#ffd343', rs: '#dea584', go: '#00add8',
  c: '#a8b9cc', cpp: '#f34b7d', h: '#a8b9cc', hpp: '#f34b7d',
  cs: '#68217a', java: '#b07219', rb: '#cc342d', php: '#4f5d95',
  swift: '#f05138', kt: '#a97bff', scala: '#c22d40', dart: '#00b4ab',
  lua: '#000080', r: '#198ce7', pl: '#0298c3', hs: '#5e5086',
  ex: '#6e4a7e', erl: '#b83998', jl: '#9558b2', zig: '#ec915c',
  clj: '#db5855', fs: '#378bba', ml: '#e37933',
  html: '#e34c26', css: '#563d7c', scss: '#c6538c', less: '#1d365d',
  vue: '#41b883', svelte: '#ff3e00',
  json: '#8bc34a', yaml: '#cb171e', yml: '#cb171e', toml: '#9c4221',
  ini: '#3f6faf', xml: '#0060ac', svg: '#ff9800',
  md: '#083fa1', sql: '#e38c00', sh: '#89e051', bash: '#89e051',
  ps1: '#012456', bat: '#c1f12e', diff: '#d01919', tex: '#3d6117',
  asm: '#d4a017', v: '#5c6bc0', sv: '#5c6bc0', vhd: '#db4d3f', vhdl: '#db4d3f',
  graphql: '#e10098', gql: '#e10098', prisma: '#0c344b',
  dockerfile: '#384d54', makefile: '#427819', cmake: '#4b9a3f',
  txt: '#9aa7c4', log: '#9aa7c4', csv: '#2aa198',
};

export function colorForPath(path: string): string {
  const name = (path.split('/').pop() || '').toLowerCase();
  if (name === '.gitignore') return '#e05d44';
  if (name === '.env') return '#d8b84c';
  if (name === 'dockerfile') return '#384d54';
  if (name === 'makefile') return '#427819';
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  return EXT_COLORS[ext] || '#9aa7c4';
}
