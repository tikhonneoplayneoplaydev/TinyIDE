import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { languageForPath } from './monacoSetup';
import CursorFX from './CursorFX';
import { readFileText } from '../fs/bridge';
import type { IdeApi, Settings } from '../types';

function editorOptions(s: Settings): monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    fontSize: s.fontSize,
    tabSize: s.tabSize,
    insertSpaces: true,
    wordWrap: s.wordWrap,
    minimap: { enabled: s.minimap },
    cursorStyle: s.cursorStyle,
    cursorBlinking: s.cursorBlinking,
    cursorSmoothCaretAnimation: 'on',
    cursorWidth: 2,
    fontFamily:
      "ui-monospace, 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace",
    fontLigatures: true,
    smoothScrolling: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: 'all',
    roundedSelection: true,
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    autoClosingBrackets: 'always',
    autoIndent: 'full',
    padding: { top: 14, bottom: 14 },
    mouseWheelZoom: true,
    scrollbar: {
      verticalScrollbarSize: 11,
      horizontalScrollbarSize: 11,
      useShadows: false,
    },
    overviewRulerLanes: 0,
    stickyScroll: { enabled: false },
    occurrencesHighlight: 'off',
    selectionHighlight: false,
    quickSuggestions: { other: true, comments: false, strings: false },
    wordBasedSuggestions: 'currentDocument',
  };
}

export default function EditorPane({ ide }: { ide: IdeApi }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef(new Map<string, monaco.editor.ITextModel>());
  const loadingPathRef = useRef<string | null>(null);

  // create editor once
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const editor = monaco.editor.create(host, {
      theme: ide.settings.theme === 'dark' ? 'comet-dark' : 'comet-light',
      ...editorOptions(ide.settings),
      automaticLayout: true,
    });
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      ide.cursorEmitter.emit({ line: e.position.lineNumber, col: e.position.column });
    });

    ide.registerEditorApi({
      focus: () => editor.focus(),
      format: () => {
        editor.getAction('editor.action.formatDocument')?.run();
      },
      getValue: () => editor.getValue(),
      reveal: (line, col) => {
        const m = editor.getModel();
        if (m && line >= 1 && line <= m.getLineCount()) {
          editor.setPosition({ lineNumber: line, column: col ?? 1 });
          editor.revealLineInCenter(line);
          editor.focus();
        }
      },
    });

    return () => {
      ide.registerEditorApi(null);
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // settings → editor
  useEffect(() => {
    editorRef.current?.updateOptions(editorOptions(ide.settings));
  }, [ide.settings]);

  // active file → model
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const path = ide.activePath;
    if (!path) {
      editor.setModel(null);
      return;
    }
    const cached = modelsRef.current.get(path);
    if (cached) {
      editor.setModel(cached);
      return;
    }
    if (loadingPathRef.current === path) return;
    loadingPathRef.current = path;

    (async () => {
      try {
        const ws = ide.workspace;
        if (!ws) return;
        const content = await readFileText(ws, path);
        const lang = languageForPath(path);
        const model = monaco.editor.createModel(
          content,
          lang,
          monaco.Uri.parse('comet://' + path)
        );
        modelsRef.current.set(path, model);
        ide.savedRef.current.set(path, content);
        model.onDidChangeContent(() => {
          const saved = ide.savedRef.current.get(path);
          if (saved !== undefined) {
            ide.setDirtyFor(path, model.getValue() !== saved);
          }
        });
        if (ide.activePath === path) {
          editor.setModel(model);
          editor.focus();
        }
      } catch (err) {
        console.error('open failed:', path, err);
        ide.toast('Не удалось открыть ' + path);
      } finally {
        loadingPathRef.current = null;
      }
    })();
  }, [ide.activePath, ide.workspace]);

  return (
    <div className="editor-area">
      <div ref={hostRef} className="editor-host" />
      <CursorFX editorRef={editorRef} settings={ide.settings} />
    </div>
  );
}
