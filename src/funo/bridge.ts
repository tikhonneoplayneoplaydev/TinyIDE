// ─── Мост к компилятору Funo (Rust-бэкенд) ─────────────────────────────────
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../fs/bridge';
import { store } from '../store';
import { readFileText } from '../fs/bridge';

export type FunoDiagnostic = {
  severity: string;
  line: number;
  column: number;
  end_column: number;
  code: string;
  title: string;
  message: string;
  example?: string | null;
  replacement?: string | null;
};

export type FunoBuildResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  generated_java: string;
  elapsed_ms: number;
  diagnostics: FunoDiagnostic[];
  artifact?: string | null;
};

export type FunoTranspileResult = { ok: boolean; java?: string; errors?: FunoDiagnostic[] };

/** Получить исходник активного .fun файла (из редактора или диска). */
export async function getFunoSource(path: string): Promise<string> {
  const ws = store.workspace;
  if (!ws) throw new Error('нет рабочей папки');
  // если файл открыт во вкладке — берём из редактора (сохранённое или текущее)
  if (store.activePath === path) {
    const api = store.editorApi;
    if (api) return api.getValue();
  }
  return readFileText(ws, path);
}

export async function funoCheck(source: string): Promise<FunoDiagnostic[]> {
  if (!isTauri) throw new Error('Проверка Funo доступна в десктоп-версии (Tauri)');
  return invoke<FunoDiagnostic[]>('funo_check', { source });
}

export async function funoTranspile(source: string): Promise<FunoTranspileResult> {
  if (!isTauri) throw new Error('Транспиляция Funo → Java доступна в десктоп-версии (Tauri)');
  return invoke<FunoTranspileResult>('funo_transpile', { source });
}

export async function funoCompile(
  source: string,
  projectRoot: string,
  runAfter: boolean
): Promise<FunoBuildResult> {
  if (!isTauri) throw new Error('Компиляция Funo доступна в десктоп-версии (Tauri)');
  return invoke<FunoBuildResult>('funo_compile', { source, projectRoot, runAfter });
}

/** Небольшая JS-проверка для веб-демо (замена funo_check). */
export function funoCheckWeb(source: string): FunoDiagnostic[] {
  const diags: FunoDiagnostic[] = [];
  const lines = source.split('\n');
  const add = (line: number, col: number, end: number, code: string, title: string, message: string) =>
    diags.push({ severity: 'error', line, column: col, end_column: end, code, title, message });

  lines.forEach((l, i) => {
    const n = i + 1;
    const open = (l.match(/{/g) || []).length;
    const close = (l.match(/}/g) || []).length;
    if (open !== close) add(n, 1, Math.max(1, l.length), 'F0001', 'Скобки', `Несбалансированные фигурные скобки в строке ${n}`);
    if (/\b(fun|if|while|for)\s*\(/.test(l))
      add(n, 1, Math.max(1, l.length), 'F0002', 'Синтаксис', 'В Funo условия пишутся без круглых скобок: if cond {');
    if (l.includes(' else if '))
      add(n, 1, Math.max(1, l.length), 'F0003', 'Синтаксис', 'Используйте else { if … } — в Funo нет else if');
  });

  if (!/\bfun\s+main\s*\(/.test(source)) {
    add(1, 1, 1, 'F0004', 'Точка входа', 'Нет функции main() — она нужна для запуска');
  }
  return diags;
}

/** Мини-транспиляция для веб-демо: очень простые программы Funo → Java. */
export function funoTranspileWeb(source: string): FunoTranspileResult {
  try {
    // самая базовая поддержка: fun main + println + return(200)
    const main = source.match(/fun\s+main\s*\(\)\s*\{([\s\S]*)\}/);
    if (!main) return { ok: false, errors: [{ severity: 'error', line: 1, column: 1, end_column: 1, code: 'F0004', title: 'Точка входа', message: 'Нет функции main()' }] };
    let body = main[1]
      .replace(/\/\/.*$/gm, '')
      .replace(/println\s*\(\s*([^)]*)\)/g, 'System.out.println($1);')
      .replace(/print\s*\(\s*([^)]*)\)/g, 'System.out.print($1);')
      .replace(/\breturn\s*\(\s*(\d+)\s*\)/g, 'return $1;')
      .replace(/return\s*\(/g, 'return (');
    body = body
      .split('\n')
      .map((l) => (l.trim() === '' ? '' : l))
      .join('\n');
    const java = `// Сгенерировано веб-демо TinyIDE (упрощённый Funo → Java)\npublic class Main {\n    public static void main(String[] args) {\n${body
      .split('\n')
      .map((l) => '        ' + l)
      .join('\n')}\n    }\n}\n`;
    return { ok: true, java };
  } catch {
    return { ok: false, errors: [{ severity: 'error', line: 1, column: 1, end_column: 1, code: 'F0000', title: 'Ошибка', message: 'Не удалось разобрать программу' }] };
  }
}
