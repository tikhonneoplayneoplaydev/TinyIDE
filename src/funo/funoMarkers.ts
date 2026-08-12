// ─── Маркеры диагностики Funo в Monaco ─────────────────────────────────────
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { FunoDiagnostic } from './bridge';

export function setMarkers(path: string, diags: FunoDiagnostic[]) {
  const uri = monaco.Uri.parse('comet://' + path);
  const model = monaco.editor.getModel(uri);
  if (!model) return;
  monaco.editor.setModelMarkers(model, 'funo', diags.map((d) => ({
    severity: d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
    message: `${d.title}: ${d.message}`,
    startLineNumber: d.line,
    startColumn: d.column,
    endLineNumber: d.line,
    endColumn: Math.max(d.end_column, d.column + 1),
  })));
}
