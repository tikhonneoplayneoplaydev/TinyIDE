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
  'cmake','prisma','plaintext','sql','powershell','batch','zig','groovy','ocaml','funo',
  'erlang','haskell','ruby','shell','lua','python','rust','go','dart','scala',
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
  twig: '#7f9a3a',
  abap: '#008fd3',
};

const DARK_TEXT = new Set(['javascript','yaml','c1f12e','qsharp','pascal','tcl','twig','cameligo','pascaligo','bat','batch']);

function textLogo(lang, color, label, size) {
  const fg = DARK_TEXT.has(lang) ? '#1a1a1a' : '#ffffff';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="40.5" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-weight="800" font-size="${size}" fill="${fg}">${label}</text></svg>`;
}

// ── рисованные логотипы ────────────────────────────────────────────────────
const HAND = {
  // Rust — оригинальный Феррис (rustacean.net, CC-BY 4.0, Karen Rustad Tölva)
  rust: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2a1f18"/><g transform="translate(32 32) scale(0.097) translate(-613 -597)"><g id="Layer-1" serif:id="Layer 1">
        <g transform="matrix(1,0,0,1,597.344,637.02)">
            <path d="M0,-279.559C-121.238,-279.559 -231.39,-264.983 -312.939,-241.23L-312.939,-38.329C-231.39,-14.575 -121.238,0 0,0C138.76,0 262.987,-19.092 346.431,-49.186L346.431,-230.37C262.987,-260.465 138.76,-279.559 0,-279.559" style="fill:rgb(165,43,0);fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,1068.75,575.642)">
            <path d="M0,-53.32L-14.211,-82.761C-14.138,-83.879 -14.08,-84.998 -14.08,-86.121C-14.08,-119.496 -48.786,-150.256 -107.177,-174.883L-107.177,2.643C-79.932,-8.849 -57.829,-21.674 -42.021,-35.482C-46.673,-16.775 -62.585,21.071 -75.271,47.686C-96.121,85.752 -103.671,118.889 -102.703,120.53C-102.086,121.563 -94.973,110.59 -84.484,92.809C-60.074,58.028 -13.82,-8.373 -4.575,-25.287C5.897,-44.461 0,-53.32 0,-53.32" style="fill:rgb(165,43,0);fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,149.064,591.421)">
            <path d="M0,-99.954C0,-93.526 1.293,-87.194 3.788,-80.985L-4.723,-65.835C-4.723,-65.835 -11.541,-56.989 0.465,-38.327C11.055,-21.872 64.1,42.54 92.097,76.271C104.123,93.564 112.276,104.216 112.99,103.187C114.114,101.554 105.514,69.087 81.631,32.046C70.487,12.151 57.177,-14.206 49.189,-33.675C71.492,-19.559 100.672,-6.755 135.341,4.265L135.341,-204.17C51.797,-177.622 0,-140.737 0,-99.954" style="fill:rgb(165,43,0);fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(-65.8097,-752.207,-752.207,65.8097,621.707,796.312)">
            <path d="M0.991,-0.034L0.933,0.008C0.933,0.014 0.933,0.02 0.933,0.026L0.99,0.069C0.996,0.073 0.999,0.08 0.998,0.087C0.997,0.094 0.992,0.1 0.986,0.103L0.92,0.133C0.919,0.139 0.918,0.145 0.916,0.15L0.964,0.203C0.968,0.208 0.97,0.216 0.968,0.222C0.965,0.229 0.96,0.234 0.953,0.236L0.882,0.254C0.88,0.259 0.877,0.264 0.875,0.27L0.91,0.33C0.914,0.336 0.914,0.344 0.91,0.35C0.907,0.356 0.9,0.36 0.893,0.361L0.82,0.365C0.817,0.369 0.813,0.374 0.81,0.379L0.832,0.445C0.835,0.452 0.833,0.459 0.828,0.465C0.824,0.47 0.816,0.473 0.809,0.472L0.737,0.462C0.733,0.466 0.729,0.47 0.724,0.474L0.733,0.544C0.734,0.551 0.731,0.558 0.725,0.562C0.719,0.566 0.711,0.568 0.704,0.565L0.636,0.542C0.631,0.546 0.626,0.549 0.621,0.552L0.615,0.621C0.615,0.629 0.61,0.635 0.604,0.638C0.597,0.641 0.589,0.641 0.583,0.638L0.521,0.602C0.52,0.603 0.519,0.603 0.518,0.603L0.406,0.729C0.406,0.729 0.394,0.747 0.359,0.725C0.329,0.705 0.206,0.599 0.141,0.543C0.109,0.52 0.089,0.504 0.09,0.502C0.093,0.499 0.149,0.509 0.217,0.554C0.278,0.588 0.371,0.631 0.38,0.619C0.38,0.619 0.396,0.604 0.406,0.575C0.406,0.575 0.406,0.575 0.406,0.575C0.407,0.576 0.407,0.576 0.406,0.575C0.406,0.575 0.091,0.024 0.305,-0.531C0.311,-0.593 0.275,-0.627 0.275,-0.627C0.266,-0.639 0.178,-0.598 0.12,-0.566C0.055,-0.523 0.002,-0.513 0,-0.516C-0.001,-0.518 0.018,-0.533 0.049,-0.555C0.11,-0.608 0.227,-0.707 0.256,-0.726C0.289,-0.748 0.301,-0.73 0.301,-0.73L0.402,-0.615C0.406,-0.614 0.41,-0.613 0.415,-0.613L0.47,-0.658C0.475,-0.663 0.483,-0.664 0.49,-0.662C0.497,-0.66 0.502,-0.655 0.504,-0.648L0.522,-0.58C0.527,-0.578 0.533,-0.576 0.538,-0.574L0.602,-0.608C0.608,-0.612 0.616,-0.612 0.623,-0.608C0.629,-0.605 0.633,-0.599 0.633,-0.592L0.637,-0.522C0.642,-0.519 0.647,-0.515 0.652,-0.512L0.721,-0.534C0.728,-0.536 0.736,-0.535 0.741,-0.531C0.747,-0.526 0.75,-0.519 0.749,-0.512L0.738,-0.443C0.742,-0.439 0.746,-0.435 0.751,-0.431L0.823,-0.439C0.83,-0.44 0.837,-0.437 0.842,-0.432C0.847,-0.426 0.848,-0.419 0.845,-0.412L0.821,-0.347C0.824,-0.342 0.828,-0.337 0.831,-0.332L0.903,-0.327C0.911,-0.327 0.917,-0.322 0.92,-0.316C0.924,-0.31 0.924,-0.302 0.92,-0.296L0.883,-0.236C0.885,-0.231 0.887,-0.226 0.889,-0.22L0.959,-0.202C0.966,-0.2 0.972,-0.195 0.974,-0.188C0.976,-0.181 0.974,-0.174 0.969,-0.168L0.92,-0.116C0.921,-0.111 0.923,-0.105 0.924,-0.099L0.988,-0.068C0.995,-0.065 0.999,-0.059 1,-0.052C1.001,-0.045 0.997,-0.038 0.991,-0.034ZM0.406,0.575C0.406,0.575 0.406,0.575 0.406,0.575C0.406,0.575 0.406,0.575 0.406,0.575Z" style="fill:url(#_Linear1);fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,450.328,483.629)">
            <path d="M0,167.33C-1.664,165.91 -2.536,165.068 -2.536,165.068L140.006,153.391C23.733,0 -69.418,122.193 -79.333,135.855L-79.333,167.33L0,167.33Z" style="fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,747.12,477.333)">
            <path d="M0,171.974C1.663,170.554 2.536,169.71 2.536,169.71L-134.448,159.687C-18.12,0 69.421,126.835 79.335,140.497L79.335,171.974L0,171.974Z" style="fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(-1.53e-05,-267.211,-267.211,1.53e-05,809.465,764.23)">
            <path d="M1,-0.586C1,-0.586 0.768,-0.528 0.524,-0.165L0.5,-0.064C0.5,-0.064 1.1,0.265 0.424,0.731C0.424,0.731 0.508,0.586 0.405,0.197C0.405,0.197 0.131,0.376 0.14,0.736C0.14,0.736 -0.275,0.391 0.324,-0.135C0.324,-0.135 0.539,-0.691 1,-0.736L1,-0.586Z" style="fill:url(#_Linear2);fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,677.392,509.61)">
            <path d="M0,-92.063C0,-92.063 43.486,-139.678 86.974,-92.063C86.974,-92.063 121.144,-28.571 86.974,3.171C86.974,3.171 31.062,47.615 0,3.171C0,3.171 -37.275,-31.75 0,-92.063" style="fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,727.738,435.209)">
            <path d="M0,0.002C0,18.543 -10.93,33.574 -24.408,33.574C-37.885,33.574 -48.814,18.543 -48.814,0.002C-48.814,-18.539 -37.885,-33.572 -24.408,-33.572C-10.93,-33.572 0,-18.539 0,0.002" style="fill:white;fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,483.3,502.984)">
            <path d="M0,-98.439C0,-98.439 74.596,-131.467 94.956,-57.748C94.956,-57.748 116.283,28.178 33.697,33.028C33.697,33.028 -71.613,12.745 0,-98.439" style="fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(1,0,0,1,520.766,436.428)">
            <path d="M0,0C0,19.119 -11.27,34.627 -25.173,34.627C-39.071,34.627 -50.344,19.119 -50.344,0C-50.344,-19.124 -39.071,-34.627 -25.173,-34.627C-11.27,-34.627 0,-19.124 0,0" style="fill:white;fill-rule:nonzero;"/>
        </g>
        <g transform="matrix(-1.53e-05,-239.021,-239.021,1.53e-05,402.161,775.388)">
            <path d="M0.367,0.129C-0.364,-0.441 0.223,-0.711 0.223,-0.711C0.259,-0.391 0.472,-0.164 0.472,-0.164C0.521,-0.548 0.525,-0.77 0.525,-0.77C1.203,-0.256 0.589,0.161 0.589,0.161C0.627,0.265 0.772,0.372 0.906,0.451L1,0.77C0.376,0.403 0.367,0.129 0.367,0.129Z" style="fill:url(#_Linear3);fill-rule:nonzero;"/>
        </g>
    </g>
    <defs>
        <linearGradient id="_Linear1" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1,0,1.38778e-17,-1,0,-0.000650515)"><stop offset="0" style="stop-color:rgb(247,76,0);stop-opacity:1"/><stop offset="0.33" style="stop-color:rgb(247,76,0);stop-opacity:1"/><stop offset="1" style="stop-color:rgb(244,150,0);stop-opacity:1"/></linearGradient>
        <linearGradient id="_Linear2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1,0,0,-1,0,1.23438e-06)"><stop offset="0" style="stop-color:rgb(204,58,0);stop-opacity:1"/><stop offset="0.15" style="stop-color:rgb(204,58,0);stop-opacity:1"/><stop offset="0.74" style="stop-color:rgb(247,76,0);stop-opacity:1"/><stop offset="1" style="stop-color:rgb(247,76,0);stop-opacity:1"/></linearGradient>
        <linearGradient id="_Linear3" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1,1.32349e-23,1.32349e-23,-1,0,-9.1568e-07)"><stop offset="0" style="stop-color:rgb(204,58,0);stop-opacity:1"/><stop offset="0.15" style="stop-color:rgb(204,58,0);stop-opacity:1"/><stop offset="0.74" style="stop-color:rgb(247,76,0);stop-opacity:1"/><stop offset="1" style="stop-color:rgb(247,76,0);stop-opacity:1"/></linearGradient>
    </defs></g></svg>`,

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

  // Lua — полумесяц
  lua: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#000080"/>
<path d="M36 10 A 24 24 0 1 0 36 54 A 19 19 0 1 1 36 10 Z" fill="#fff"/></svg>`,

  // Julia — три точки (фирменный знак языка)
  julia: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#9558b2"/>
<circle cx="32" cy="18" r="9" fill="#389826" stroke="#fff" stroke-width="2.5"/>
<circle cx="20" cy="41" r="9" fill="#cb3c33" stroke="#fff" stroke-width="2.5"/>
<circle cx="44" cy="41" r="9" fill="#ffffff" stroke="#fff" stroke-width="2.5"/></svg>`,

  // Zig — молния-Z
  zig: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#ec915c"/>
<path d="M42 12 L24 33 H33 L22 52 L41 30 H32 Z" fill="#fff"/></svg>`,

  // Dart — мишень со стрелой
  dart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00b4ab"/>
<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="4.5"/>
<circle cx="32" cy="32" r="6.5" fill="#fff"/>
<path d="M24 40 L40 24" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
<path d="M40 24 l-9 3 l4 -8 z" fill="#fff"/></svg>`,

  // SCSS — витиеватая S с хвостом
  scss: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#c6538c"/>
<path d="M24 17 C 24 11 41 11 41 17 C 41 25 21 23 21 32 C 21 42 40 43 43 35 C 45 30 44 26 42 21" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,

  // Less — знак «меньше»
  less: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1d365d"/>
<path d="M20 20 L36 32 L20 44" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // PHP — слон (elePHPant)
  php: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4f5d95"/>
<circle cx="18" cy="31" r="9" fill="#fff"/>
<circle cx="25" cy="29" r="6" fill="#4f5d95"/>
<path d="M12 35 q -7 5 -4 14 q 1 4 5 3" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
<rect x="22" y="30" width="24" height="14" rx="7" fill="#fff"/>
<path d="M26 44 v8 M34 44 v8 M42 44 v8" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
<path d="M48 36 q 5 1 4 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,

  // Perl — верблюд
  perl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0298c3"/>
<path d="M13 43 C 13 33 21 31 24 37 C 26 29 35 29 37 37 C 42 34 47 38 45 43" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13 43 q -2 -6 1 -9" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/>
<path d="M18 43 v7 M27 43 v7 M36 43 v7 M44 43 v7" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>`,

  // Handlebars — усы
  handlebars: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f7931e"/>
<path d="M12 37 Q 20 18 32 30 Q 44 18 52 37 Q 44 41 38 35 Q 35 43 32 43 Q 29 43 26 35 Q 20 41 12 37 Z" fill="#fff"/></svg>`,

  // Solidity — стопка ромбов
  solidity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#aa6746"/>
<path d="M32 11 l6 8 -6 8 -6 -8 z" fill="#fff"/>
<path d="M32 24 l9 11 -9 11 -9 -11 z" fill="#fff"/>
<path d="M32 42 l11 13 -11 13 -11 -13 z" fill="#fff"/></svg>`,

  // plaintext — документ с текстом
  plaintext: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#9aa7c4"/>
<rect x="17" y="9" width="30" height="46" rx="4" fill="#fff"/>
<path d="M47 9 h-7 a7 7 0 0 1 7 7 z" fill="#9aa7c4"/>
<path d="M24 22 h16 M24 28 h16 M24 34 h10" stroke="#9aa7c4" stroke-width="3.2" stroke-linecap="round"/></svg>`,

  // PowerShell — терминал с курсором
  powershell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#012456"/>
<rect x="13" y="15" width="38" height="34" rx="5" fill="none" stroke="#fff" stroke-width="4"/>
<path d="M20 26 h16 M20 33 h24" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
<rect x="20" y="40" width="8" height="3.5" fill="#fff"/></svg>`,

  // Batch — окно консоли
  batch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#c1f12e"/>
<rect x="14" y="17" width="36" height="30" rx="4" fill="none" stroke="#fff" stroke-width="4"/>
<path d="M14 25 h36" stroke="#fff" stroke-width="4"/>
<circle cx="21" cy="21" r="1.8" fill="#fff"/><circle cx="27" cy="21" r="1.8" fill="#fff"/><circle cx="33" cy="21" r="1.8" fill="#fff"/>
<path d="M20 33 h14 M20 39 h9" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
<rect x="31" y="37.5" width="6" height="3" fill="#fff"/></svg>`,

  // MySQL — дельфин
  mysql: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00758f"/>
<path d="M14 42 C 16 28 24 21 32 24 C 42 27 48 33 47 42 C 44 34 38 30 31 32 C 22 34 16 38 14 42 Z" fill="#fff"/>
<path d="M30 25 q -4 -9 4 -11 q 2 7 -2 11 z" fill="#fff"/>
<path d="M47 40 q 6 -3 7 -9 q -3 6 -9 6 z" fill="#fff"/></svg>`,

  // PostgreSQL — слон
  pgsql: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#336791"/>
<ellipse cx="26" cy="36" rx="15" ry="10" fill="#fff"/>
<circle cx="42" cy="27" r="8" fill="#fff"/>
<circle cx="39" cy="25" r="5" fill="#336791"/>
<path d="M48 29 q 6 2 5 12 q -1 4 -5 3" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M15 42 v7 M23 42 v7 M31 42 v7" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
<path d="M11 36 q -5 -1 -4 -6" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,

  // Twig — ветка с листьями
  twig: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7f9a3a"/>
<path d="M13 47 Q 30 30 51 15" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/>
<path d="M27 35 q -8 -10 -16 -8 M36 27 q -7 -11 -14 -10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
<ellipse cx="12" cy="25" rx="4.5" ry="7" transform="rotate(25 12 25)" fill="#fff"/>
<ellipse cx="23" cy="17" rx="4.5" ry="7" transform="rotate(35 23 17)" fill="#fff"/></svg>`,

  // Pug — мордочка мопса
  pug: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#a86454"/>
<ellipse cx="32" cy="33" rx="17" ry="15" fill="#fff"/>
<path d="M17 26 q -8 -13 1 -16 q 7 -2 9 8 z M47 26 q 8 -13 -1 -16 q -7 -2 -9 8 z" fill="#fff"/>
<circle cx="32" cy="40" r="8" fill="#a86454"/>
<circle cx="26" cy="30" r="2.6" fill="#a86454"/>
<circle cx="38" cy="30" r="2.6" fill="#a86454"/>
<path d="M28 42 q 4 3 8 0" stroke="#a86454" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,

  // Liquid — капля
  liquid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#67b8de"/>
<path d="M32 10 C 43 25 47 33 47 39 A 15 15 0 1 1 17 39 C 17 33 21 25 32 10 Z" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round"/></svg>`,

  // Cypher — замок
  cypher: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#34c0eb"/>
<path d="M24 30 v-5 a8 8 0 0 1 16 0 v5" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/>
<rect x="18" y="29" width="28" height="21" rx="4.5" fill="#fff"/>
<circle cx="32" cy="37" r="3.2" fill="#34c0eb"/>
<path d="M32 40 v4.5" stroke="#34c0eb" stroke-width="3" stroke-linecap="round"/></svg>`,

  // Groovy — восьмая нота
  groovy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4298b8"/>
<ellipse cx="28" cy="40" rx="10" ry="7.5" fill="#fff"/>
<path d="M36 33 V16" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
<path d="M36 16 q 10 3 7 12" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/></svg>`,

  // F# — диез из штрихов
  fsharp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#378bba"/>
<path d="M28 13 L24 51 M40 13 L36 51 M16 26 h32 M15 38 h32" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>`,

  // Redis — стопка серверов
  redis: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#d82c20"/>
<rect x="17" y="15" width="30" height="10" rx="3" fill="#fff"/>
<rect x="17" y="27" width="30" height="10" rx="3" fill="#fff"/>
<rect x="17" y="39" width="30" height="10" rx="3" fill="#fff"/></svg>`,

  // Scala — спираль
  scala: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#c22d40"/>
<path d="M21 20 q 0 -9 11 -9 q 13 0 13 11 q 0 11 -13 13 q -15 3 -15 15 q 0 8 12 8" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/></svg>`,

  // ABAP — сапфир SAP
  abap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#008fd3"/>
<path d="M32 13 L51 32 L32 51 L13 32 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
<path d="M32 24 L40 32 L32 40 L24 32 Z" fill="#fff" opacity="0.85"/></svg>`,

  // Apex — искра
  apex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1797c0"/>
<path d="M32 10 L36 28 L54 32 L36 36 L32 54 L28 36 L10 32 L28 28 Z" fill="#fff"/></svg>`,

  // XML — угловые скобки
  xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0060ac"/>
<path d="M20 22 L11 32 L20 42 M44 22 L53 32 L44 42" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Bicep — согнутая рука с бицепсом
  bicep: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#519aba"/>
<path d="M14 44 C 16 30 26 22 40 24 C 52 26 54 40 48 46" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
<ellipse cx="30" cy="34" rx="10" ry="6" transform="rotate(-30 30 34)" fill="#fff"/></svg>`,

  // Erlang — узел (фирменный знак)
  erlang: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#b83998"/>
<circle cx="32" cy="32" r="15" fill="none" stroke="#fff" stroke-width="4.5"/>
<circle cx="14" cy="14" r="4.5" fill="#fff"/><circle cx="50" cy="14" r="4.5" fill="#fff"/>
<circle cx="14" cy="50" r="4.5" fill="#fff"/><circle cx="50" cy="50" r="4.5" fill="#fff"/></svg>`,

  // R — буква с хвостом-волной (в духе фирменного)
  r: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#198ce7"/>
<text x="30" y="39" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="26" fill="#fff">R</text>
<path d="M20 46 q 6 5 12 0 q 6 -5 12 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,

  // Scheme — скобки-спираль
  scheme: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1e4aec"/>
<path d="M22 20 q -7 7 0 12 q 7 5 0 12 M42 20 q 7 7 0 12 q -7 5 0 12" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/></svg>`,

  // OCaml — кристалл
  ocaml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#ec6813"/>
<path d="M32 12 L51 32 L32 52 L13 32 Z" fill="#fff"/>
<path d="M32 22 L42 32 L32 42 L22 32 Z" fill="#ec6813"/></svg>`,

  // Tcl — черепаха
  tcl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e4cc98"/>
<circle cx="31" cy="34" r="13" fill="#5b7d4e"/>
<path d="M18 34 q -5 -5 -4 -11 M18 38 q -6 3 -4 9 M46 34 q 5 -5 4 -11 M46 38 q 6 3 4 9" stroke="#5b7d4e" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="13" cy="22" r="3.5" fill="#5b7d4e"/>
<circle cx="51" cy="22" r="3.5" fill="#5b7d4e"/>
<path d="M31 21 v-7 q 0 -4 -3 -4" stroke="#5b7d4e" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,

  // TOML — домик с T
  toml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#9c4221"/>
<path d="M12 27 L32 12 L52 27" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="18" y="29" width="28" height="23" rx="3" fill="#fff"/>
<path d="M24 36 h16 M24 42 h16" stroke="#9c4221" stroke-width="3.4" stroke-linecap="round"/></svg>`,

  // YAML — Y со стрелками вниз
  yaml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#cb171e"/>
<path d="M16 14 L32 36 L48 14" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 50 h20 M32 38 v12" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // INI — шестерёнка настроек
  ini: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3f6faf"/>
<circle cx="32" cy="32" r="11" fill="#fff"/>
<path d="M32 13 v7 M32 44 v7 M13 32 h7 M44 32 h7 M19.5 19.5 l5 5 M39.5 39.5 l5 5 M44.5 19.5 l-5 5 M24.5 39.5 l-5 5" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,

  // Makefile — гаечный ключ
  makefile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#427819"/>
<path d="M45 14 L30 29 a11 11 0 1 0 5 5 l15 -15 z" fill="#fff" transform="rotate(45 32 32)"/></svg>`,

  // CMake — ключ + гайка
  cmake: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#da3434"/>
<path d="M42 12 L30 24 a9 9 0 1 0 4 4 l12 -12 z" fill="#fff" transform="rotate(40 32 32)"/>
<polygon points="45,36 50,39 50,45 45,48 40,45 40,39" fill="#fff"/></svg>`,

  // Verilog — цифровой сигнал
  verilog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#5c6bc0"/>
<path d="M10 48 h8 v-20 h9 v10 h10 v-24 h8 v14 h9 v-8 h8 v22" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // SystemVerilog — сигнал с регистром
  systemverilog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6a7cc9"/>
<path d="M10 46 h9 v-18 h10 v10 h9 v-22 h9 v12 h8 v-6 h9 v24" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="16" y="36" width="7" height="7" fill="#fff"/></svg>`,

  // VHDL — сигнал с пиками
  vhdl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#db4d3f"/>
<path d="M12 46 h8 v-22 h7 l6 22 h6 l6 -22 h7 l6 22 h4" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // ASM — микросхема
  asm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#9c7a3c"/>
<rect x="20" y="20" width="24" height="24" rx="3" fill="#fff"/>
<path d="M26 13 v7 M32 13 v7 M38 13 v7 M26 44 v7 M32 44 v7 M38 44 v7 M13 26 h7 M13 32 h7 M13 38 h7 M44 26 h7 M44 32 h7 M44 38 h7" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
<circle cx="32" cy="32" r="5" fill="#9c7a3c"/></svg>`,

  // TeX/LaTeX — сигма
  tex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3d6117"/>
<path d="M18 14 h28 M22 14 h3 l10 18 -10 18 h-3 M18 50 h28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Diff — плюс/минус
  diff: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#d01919"/>
<rect x="10" y="10" width="20" height="20" rx="4" fill="#34d399"/>
<path d="M20 15 v10 M15 20 h10" stroke="#064e3b" stroke-width="3.6" stroke-linecap="round"/>
<rect x="34" y="34" width="20" height="20" rx="4" fill="#f87171"/>
<path d="M39 44 h10" stroke="#7f1d1d" stroke-width="3.6" stroke-linecap="round"/></svg>`,

  // Q# — бра-кет
  qsharp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#fed659"/>
<text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="19" fill="#1a1a1a">|ψ⟩</text></svg>`,

  // Razor — лезвие
  razor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#512bd4"/>
<path d="M20 14 L48 30 L44 36 L38 39 L22 18 Z" fill="#fff"/>
<path d="M38 39 L20 14" stroke="#512bd4" stroke-width="3"/>
<path d="M38 34 l3 8 M34 32 l3 8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`,

  // Protobuf — куб
  protobuf: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#607d8b"/>
<path d="M32 12 L50 24 V40 L32 52 L14 40 V24 Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
<path d="M14 24 L32 36 L50 24 M32 36 V52" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/></svg>`,

  // Objective-C — буква с молнией
  'objective-c': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#438eff"/>
<circle cx="32" cy="32" r="18" fill="none" stroke="#fff" stroke-width="5"/>
<path d="M30 18 L22 34 H28 L24 46 L40 28 H33 L36 18 Z" fill="#fff"/></svg>`,

  // HCL — щит
  hcl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#844fba"/>
<path d="M32 10 L50 17 V32 C 50 45 42 52 32 55 C 22 52 14 45 14 32 V17 Z" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M24 38 V24 L32 30 L40 24 V38" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // MIPS — процессор с M
  mips: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#d4a017"/>
<rect x="18" y="18" width="28" height="28" rx="3" fill="#fff"/>
<path d="M24 12 v6 M32 12 v6 M40 12 v6 M24 46 v6 M32 46 v6 M40 46 v6 M12 24 h6 M12 32 h6 M12 40 h6 M46 24 h6 M46 32 h6 M46 40 h6" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
<text x="32" y="37" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="16" fill="#d4a017">M</text></svg>`,

  // Redshift — красная галактика
  redshift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e4433d"/>
<circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="4"/>
<circle cx="32" cy="32" r="6" fill="#fff"/>
<ellipse cx="32" cy="32" rx="22" ry="6" transform="rotate(-18 32 32)" fill="none" stroke="#fff" stroke-width="2.6"/></svg>`,

  // Pascal — треугольник с P
  pascal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e3f171"/>
<path d="M16 50 L32 14 L48 50 Z" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round"/>
<text x="32" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="17" fill="#fff">P</text></svg>`,

  // PowerQuery — PQ
  powerquery: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#d24136"/>
<text x="32" y="41" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="21" fill="#fff">PQ</text></svg>`,

  // WGSL — шейдер-куб
  wgsl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#8f4fd1"/>
<path d="M32 10 L50 22 V44 L32 54 L14 44 V22 Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
<path d="M14 22 L32 34 L50 22 M32 34 V54" fill="#fff" opacity="0.25" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`,

  // Azure CLI — облако
  azcli: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0064ad"/>
<path d="M20 44 a9 9 0 0 1 1.5 -17.9 A12 12 0 0 1 45 26 a8.5 8.5 0 0 1 -1 17 Z" fill="#fff"/>
<text x="32" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="13" fill="#0064ad">AZ</text></svg>`,

  // Freemarker2 — F с молнией
  freemarker2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#8a6d3b"/>
<path d="M26 14 V50 M26 14 H42 M26 30 H38" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round"/>
<path d="M42 36 L30 46 M36 34 l-2 10" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/></svg>`,

  // Postiats/ATS — стрелка-треугольник
  postiats: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1e4aec"/>
<path d="M16 20 L40 32 L16 44 Z" fill="#fff"/>
<path d="M36 16 L52 32 L36 48" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Ligo (Cameligo/Pascaligo) — волна интерферометра
  pascaligo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3be133"/>
<path d="M12 22 q 7 -7 14 0 t 14 0 t 14 0" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/>
<path d="M12 34 q 7 -7 14 0 t 14 0 t 14 0" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.7"/>
<path d="M12 46 q 7 -7 14 0 t 14 0 t 14 0" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.4"/></svg>`,
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
  plaintext:'TXT', jsonc:'JSONC', json5:'JSON5', batch:'BAT', vbs:'VBS', funo:'Funo',
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
out.jsonc = out.json; out.json5 = out.json;
out.latex = out.tex; out.cameligo = out.pascaligo;
out.m3 = out.erlang; out.msdax = out.pgsql; out.sophia = out.solidity;
out.st = out.verilog; out.pla = out.plaintext; out.sb = out.plaintext;
out.restructuredtext = out.plaintext; out.mdx = out.markdown;
out.flow9 = out.lexon ? out.lexon : out.plaintext; out.ecl = out.erlang;

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
