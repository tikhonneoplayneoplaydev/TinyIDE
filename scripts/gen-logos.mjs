// Генератор логотипов языков → src/languages/logos.ts + галерея
import { writeFileSync, mkdirSync } from 'fs';

// ── языки Monaco (из node_modules) + дополнительные ──────────────────────
const MONACO_LANGS = [
  'abap','apex','azcli','bat','bicep','cameligo','clojure','coffee','cpp','csharp',
  'csp','css','cypher','dart','dockerfile','ecl','elixir','flow9','freemarker2',
  'fsharp','go','graphql','handlebars','hcl','html','ini','java','javascript',
  'julia','kotlin','less','lexon','liquid','lua','m3','markdown','mdx','mips',
  'msdax','mysql','objective-c','pascal','pascaligo','perl','pgsql','php','pla',
  'postiats','powerquery','powershell','protobuf','pug','python','qsharp','r',
  'razor','redis','redshift','restructuredtext','ruby','rust','sb','scala',
  'scheme','scss','shell','solidity','sophia','sparql','sql','st','swift',
  'systemverilog','tcl','twig','typescript','typespec','vb','wgsl','xml','yaml',
];

const EXTRA = [
  'json','jsonc','json5','typescript','css','scss','less','html','vue','svelte',
  'toml','diff','tex','latex','asm','verilog','systemverilog','vhdl','makefile',
  'cmake','prisma','plaintext','sql','powershell','batch',
];

const LANGS = [...new Set([...MONACO_LANGS, ...EXTRA])];

// ── цвета (GitHub Linguist) ────────────────────────────────────────────────
const COLORS = {
  javascript: '#f1e05a', typescript: '#3178c6', python: '#3572A5', rust: '#dea584',
  go: '#00ADD8', c: '#555555', cpp: '#f34b7d', csharp: '#512BD4', java: '#b07219',
  kotlin: '#A97BFF', swift: '#F05138', ruby: '#701516', php: '#4F5D95',
  html: '#e34c26', css: '#563d7c', scss: '#c6538c', less: '#1d365d',
  json: '#3E7B27', jsonc: '#3E7B27', json5: '#3E7B27', yaml: '#cb171e',
  toml: '#9c4221', ini: '#3f6faf', xml: '#0060ac', markdown: '#083fa1',
  sql: '#e38c00', mysql: '#00758f', pgsql: '#336791', redis: '#d82c20',
  redshift: '#e4433d', shell: '#89e051', powershell: '#012456', bat: '#c1f12e',
  batch: '#c1f12e', diff: '#d01919', tex: '#3d6117', latex: '#3d6117',
  asm: '#9c7a3c', verilog: '#5c6bc0', systemverilog: '#6a7cc9', vhdl: '#db4d3f',
  makefile: '#427819', cmake: '#da3434', prisma: '#0c344b', plaintext: '#9aa7c4',
  dockerfile: '#384d54', lua: '#000080', r: '#198ce7', perl: '#0298c3',
  haskell: '#5e5086', elixir: '#6e4a7e', erlang: '#b83998', julia: '#9558b2',
  zig: '#ec915c', dart: '#00b4ab', scala: '#c22d40', fsharp: '#378bba',
  ocaml: '#3be133', clojure: '#db5855', groovy: '#4298b8', coffee: '#244776',
  vb: '#945db7', vbs: '#1d5a9e', pascal: '#e3f171', scheme: '#1e4aec',
  raku: '#0000fb', smalltalk: '#596706', abap: '#e8274b', apex: '#1797c0',
  azcli: '#0064ad', bicep: '#519aba', cypher: '#34c0eb', ecl: '#8a1267',
  flow9: '#2d2d2d', freemarker2: '#8a6d3b', handlebars: '#f7931e', hcl: '#844fba',
  lexon: '#1a5fab', liquid: '#67b8de', m3: '#4e9a51', mdx: '#323232',
  mips: '#d4a017', msdax: '#00758f', pascaligo: '#3be133', pla: '#6b7280',
  postiats: '#1e4aec', powerquery: '#d24136', protobuf: '#607d8b', pug: '#a86454',
  qsharp: '#fed659', razor: '#512bd4', restructuredtext: '#141414',
  sb: '#6b7280', sophia: '#cc6687', sparql: '#0c4597', st: '#58595b',
  tcl: '#e4cc98', twig: '#c1d026', typespec: '#2f6f37', wgsl: '#8f4fd1',
  cameligo: '#3be133', vue: '#41b883', svelte: '#ff3e00', graphql: '#e10098',
  solidity: '#aa6746', css3: '#264de4', latex2: '#3d6117', sql2: '#e38c00',
  objc: '#438eff', 'objective-c': '#438eff', csp: '#5c6bc0', vhdl2: '#db4d3f',
};

const DARK_TEXT = new Set(['javascript','yaml','c1f12e','qsharp','pascal','tcl','twig','cameligo','pascaligo','bat','batch']);

function textLogo(lang, color, label, size) {
  const fg = DARK_TEXT.has(lang) ? '#1a1a1a' : '#ffffff';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="40.5" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-weight="800" font-size="${size}" fill="${fg}">${label}</text></svg>`;
}

// ── рисованные логотипы ────────────────────────────────────────────────────
const HAND = {
  // Rust — краб (в духе Ферриса)
  rust: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2a1f18"/>
<g stroke="#e05d2b" stroke-width="4.5" fill="none" stroke-linecap="round">
<path d="M15 30 q-9 0 -5 10 M13 37 q-8 3 -3 11 M16 44 q-6 4 -1 11"/>
<path d="M49 30 q9 0 5 10 M51 37 q8 3 3 11 M48 44 q6 4 1 11"/>
</g>
<circle cx="17" cy="19" r="8.5" fill="#c9431c"/><circle cx="13.5" cy="15.5" r="4.5" fill="#2a1f18"/>
<circle cx="47" cy="19" r="8.5" fill="#c9431c"/><circle cx="50.5" cy="15.5" r="4.5" fill="#2a1f18"/>
<ellipse cx="32" cy="34" rx="15" ry="12" fill="#e05d2b"/>
<circle cx="27" cy="31" r="2.4" fill="#fff"/><circle cx="37" cy="31" r="2.4" fill="#fff"/>
<circle cx="27.6" cy="31.7" r="1.1" fill="#2a1f18"/><circle cx="37.6" cy="31.7" r="1.1" fill="#2a1f18"/>
<path d="M27.5 39.5 q4.5 3.5 9 0" stroke="#2a1f18" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,

  // Python — две змейки
  python: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3776ab"/>
<path d="M24 10 q16 -8 22 6 q6 14 -8 24 q-14 10 -16 24" stroke="#ffd43b" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M40 10 q-16 -8 -22 6 q-6 14 8 24 q14 10 16 24" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round"/>
<circle cx="24" cy="10" r="5" fill="#ffd43b"/><circle cx="40" cy="10" r="5" fill="#ffffff"/>
<circle cx="22.4" cy="8.6" r="1.4" fill="#3776ab"/><circle cx="38.4" cy="8.6" r="1.4" fill="#3776ab"/></svg>`,

  // Java — чашка кофе с паром
  java: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#b07219"/>
<path d="M21 21 q4 -7 0 -13 M32 21 q4 -7 0 -13 M43 21 q4 -7 0 -13" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M16 30 h26 a9 9 0 0 1 0 18 h-26 a9 9 0 0 1 0 -18 z" fill="none" stroke="#fff" stroke-width="3.6"/>
<path d="M42 34 h5 a6 6 0 0 1 0 12 h-5" fill="none" stroke="#fff" stroke-width="3.6"/>
<path d="M18 52 h22" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>`,

  // Go — буквы с хвостиком
  go: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00add8"/>
<text x="30" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="27" fill="#fff">Go</text>
<path d="M44 46 q8 0 6 8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,

  cpp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00599c"/><text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="25" fill="#fff">C++</text></svg>`,
  c: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#555555"/><text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="26" fill="#fff">C</text></svg>`,
  csharp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#512bd4"/><text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="25" fill="#fff">C#</text></svg>`,
  javascript: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f7df1e"/><text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="24" fill="#1a1a1a">JS</text></svg>`,
  typescript: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3178c6"/><text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="24" fill="#fff">TS</text></svg>`,
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e34c26"/><text x="32" y="41" text-anchor="middle" font-family="ui-monospace,monospace" font-weight="800" font-size="20" fill="#fff">&lt;/&gt;</text></svg>`,
  css: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#264de4"/><text x="32" y="42" text-anchor="middle" font-family="ui-monospace,monospace" font-weight="800" font-size="30" fill="#fff">#</text></svg>`,

  // Swift — ласточка
  swift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f05138"/>
<path d="M12 46 Q 20 18 54 10 Q 38 22 28 34" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round"/>
<path d="M16 48 Q 26 40 34 46 Q 40 50 48 54" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round"/></svg>`,

  // Kotlin — ромб с K
  kotlin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7f52ff"/>
<path d="M32 11 L53 32 L32 53 L11 32 Z" fill="#fff"/><text x="32" y="40" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="24" fill="#7f52ff">K</text></svg>`,

  // Ruby — рубин
  ruby: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#cc342d"/>
<path d="M32 8 L56 32 L32 56 L8 32 Z" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M32 20 L44 32 L32 44 L20 32 Z" fill="#fff" opacity="0.85"/></svg>`,

  // SQL — база данных
  sql: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e38c00"/>
<ellipse cx="32" cy="19" rx="15" ry="5.5" fill="#fff"/>
<path d="M17 19 v15 a15 5.5 0 0 0 30 0 V19" fill="none" stroke="#fff" stroke-width="4"/>
<ellipse cx="32" cy="28" rx="15" ry="5.5" fill="none" stroke="#fff" stroke-width="2.6" opacity="0.75"/></svg>`,

  // Markdown — M↓
  markdown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#083fa1"/>
<text x="32" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="25" fill="#fff">M</text>
<path d="M32 42 v11 M26 47.5 l6 6 6-6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Haskell — лямбда
  haskell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#5e5086"/>
<path d="M18 18 L34 33 M34 33 L48 48 M34 33 L46 22" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Elixir — капля
  elixir: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6e4a7e"/>
<path d="M32 10 C 46 26 48 38 32 52 C 16 38 18 26 32 10 Z" fill="#fff"/>
<path d="M24 38 q3 -4 6 0 q3 4 6 0" stroke="#6e4a7e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,

  // Docker — контейнер с волнами
  dockerfile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2496ed"/>
<rect x="16" y="22" width="33" height="22" rx="4" fill="none" stroke="#fff" stroke-width="4"/>
<path d="M16 32 h33" stroke="#fff" stroke-width="4"/>
<path d="M9 28 q-4 0 -4 -3.5 M9 36 q-4 0 -4 -3.5" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,

  // Vue — V
  vue: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#41b883"/>
<path d="M12 14 L32 52 L52 14 H41 L32 29 L23 14 Z" fill="#fff"/></svg>`,

  // Svelte — S
  svelte: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#ff3e00"/>
<path d="M42 18 C 46 20 48 25 46 30 C 44 35 38 37 32 39 C 27 41 23 43 23 48 C 23 52 26 55 30 56 L 28 51 C 26 50 26 47 28 45 C 30 42 35 40 40 38 C 45 36 50 33 50 26 C 50 20 46 16 40 15 Z" fill="#fff"/></svg>`,

  // GraphQL — ромб с треугольниками
  graphql: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e10098"/>
<path d="M32 12 L50 32 L32 52 L14 32 Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
<path d="M32 19 L41 32 L32 45 L23 32 Z" fill="#fff" opacity="0.9"/></svg>`,

  // CoffeeScript — кружка
  coffee: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#244776"/>
<path d="M16 26 h28 a8 8 0 0 1 0 16 h-28 a8 8 0 0 1 0 -16 z" fill="none" stroke="#fff" stroke-width="3.6"/>
<path d="M44 30 h4 a5 5 0 0 1 0 10 h-4" fill="none" stroke="#fff" stroke-width="3.6"/>
<path d="M18 48 h24" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
<path d="M24 18 q3 -4 0 -8 M34 18 q3 -4 0 -8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,

  // Clojure — скобки
  clojure: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#db5855"/>
<path d="M24 18 q-6 6 -6 14 q0 8 6 14 M40 18 q6 6 6 14 q0 8 -6 14" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/></svg>`,

  // JSON — фигурные скобки
  json: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3e7b27"/>
<path d="M28 14 q-5 0 -5 5 v7 q0 4 -4 5 q4 1 4 5 v7 q0 5 5 5 M36 14 q5 0 5 5 v7 q0 4 4 5 q-4 1 -4 5 v7 q0 5 -5 5" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/></svg>`,

  // Shell — >_
  shell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3e5c2e"/>
<path d="M18 22 L30 32 L18 42" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M34 44 h14" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
};

// ── метки для остальных ────────────────────────────────────────────────────
const LABELS = {
  abap:'ABAP', apex:'Apex', azcli:'AZ', bicep:'Bicep', cameligo:'LIGO',
  csp:'CSP', cypher:'Cypher', ecl:'ECL', flow9:'F9', freemarker2:'FTL',
  handlebars:'HB', hcl:'HCL', lexon:'Lexon', liquid:'Liquid', m3:'M3',
  mdx:'MDX', mips:'MIPS', msdax:'MSDAX', mysql:'MySQL', 'objective-c':'ObjC',
  pascal:'Pascal', pascaligo:'LIGO', perl:'Perl', pgsql:'PgSQL', php:'php',
  pla:'PLA', postiats:'ATS', powerquery:'PQ', powershell:'PS', protobuf:'Proto',
  pug:'Pug', qsharp:'Q#', r:'R', razor:'Razor', redis:'Redis',
  redshift:'Redshift', restructuredtext:'RST', sb:'SB', scala:'Scala',
  scheme:'Scheme', scss:'SCSS', solidity:'SOL', sophia:'Sophia', sparql:'SPARQL',
  st:'ST', swift2:'', systemverilog:'SV', tcl:'Tcl', twig:'Twig',
  typespec:'TypeSpec', vb:'VB', wgsl:'WGSL', xml:'XML', yaml:'YAML',
  ini:'INI', toml:'TOML', lua:'Lua', julia:'Julia', dart:'Dart', zig:'Zig',
  fsharp:'F#', erlang:'Erlang', groovy:'Groovy', less:'Less', vue:'Vue',
  svelte:'Svelte', diff:'±', tex:'LaTeX', latex:'LaTeX', asm:'ASM',
  verilog:'V', vhdl:'VHDL', makefile:'Make', cmake:'CMake', prisma:'Prisma',
  plaintext:'TXT', jsonc:'JSONC', json5:'JSON5', batch:'BAT', vbs:'VBS',
  ocaml:'OCaml', clojure:'Clj',
};

function autoLabel(lang) {
  if (LABELS[lang]) return LABELS[lang];
  const map = { abap:'ABAP', apex:'Apex', azcli:'AZ' };
  if (lang.length <= 4) return lang.toUpperCase();
  return lang.slice(0, 1).toUpperCase() + lang.slice(1);
}

// ── сборка ─────────────────────────────────────────────────────────────────
const out = {};
for (const lang of LANGS) {
  const color = COLORS[lang] || '#6b7280';
  if (HAND[lang]) out[lang] = { color, svg: HAND[lang] };
  else {
    const label = autoLabel(lang);
    const size = label.length <= 2 ? 26 : label.length <= 4 ? 21 : label.length <= 7 ? 15 : 12;
    out[lang] = { color, svg: textLogo(lang, color, label, size) };
  }
}
// алиасы
out.typescript2 = out.typescript; out.css2 = out.css; out.scss2 = out.scss;
out.html2 = out.html; out.json2 = out.json; out['c++'] = out.cpp;

const code = `// ⚡ AUTO-GENERATED by scripts/gen-logos.mjs — не редактировать вручную
export const langLogos: Record<string, { color: string; svg: string }> = ${JSON.stringify(out, null, 2)};
`;
mkdirSync('src/languages', { recursive: true });
writeFileSync('src/languages/logos.ts', code);
console.log('generated', Object.keys(out).length, 'logos → src/languages/logos.ts');

// ── галерея ────────────────────────────────────────────────────────────────
const cards = Object.entries(out)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([id, v]) => `<div class="card"><div class="logo">${v.svg.replace(/<svg /, '<svg width="56" height="56" ')}</div><div class="name">${id}</div><div class="color">${v.color}</div></div>`)
  .join('\n');
const gallery = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Логотипы языков — TinyIDE</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0a0d16;color:#dbe3f5}
h1{text-align:center;padding:28px 0 4px;font-size:26px;background:linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6);-webkit-background-clip:text;background-clip:text;color:transparent}
p.sub{text-align:center;color:#7c88a8;font-size:13px;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:12px;padding:0 18px 40px;max-width:1200px;margin:0 auto}
.card{background:#121829;border:1px solid #1e2740;border-radius:14px;padding:14px 10px 10px;text-align:center;transition:transform .15s,border-color .15s}
.card:hover{transform:translateY(-3px);border-color:#22d3ee}
.logo{display:flex;justify-content:center;margin-bottom:9px}
.logo svg{border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.4)}
.name{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.color{font-size:10px;color:#7c88a8;font-family:monospace}
</style></head><body>
<h1>🌠 TinyIDE — логотипы языков (${Object.keys(out).length})</h1>
<p class="sub">Все языки Monaco + дополнительные · SVG, фирменные цвета</p>
<div class="grid">
${cards}
</div></body></html>`;
writeFileSync('/home/user/logos-gallery.html', gallery);
console.log('gallery → /home/user/logos-gallery.html');
