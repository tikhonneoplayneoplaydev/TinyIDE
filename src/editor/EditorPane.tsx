import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { languageForPath, applyCometTheme } from './monacoSetup';
import { ACCENT_PRESETS } from '../types';
import CursorFX from './CursorFX';
import { readFileText } from '../fs/bridge';
import type { IdeApi, Settings } from '../types';

function editorOptions(s: Settings): monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    fontSize: s.fontSize,
    tabSize: s.tabSize,
    insertSpaces: s.insertSpaces,
    wordWrap: s.wordWrap,
    minimap: { enabled: s.minimap },
    cursorStyle: s.cursorStyle,
    cursorBlinking: s.cursorBlinking,
    cursorSmoothCaretAnimation: s.smoothCaret ? 'on' : 'off',
    cursorWidth: s.cursorWidth,
    fontFamily: s.fontFamily,
    fontLigatures: s.fontLigatures,
    lineHeight: s.lineHeight,
    smoothScrolling: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: s.renderLineHighlight,
    roundedSelection: true,
    bracketPairColorization: { enabled: s.bracketPairColorization },
    guides: { bracketPairs: s.indentGuides, indentation: s.indentGuides },
    autoClosingBrackets: s.autoClosingBrackets ? 'always' : 'never',
    autoIndent: 'full',
    padding: { top: s.paddingY, bottom: s.paddingY },
    mouseWheelZoom: s.mouseWheelZoom,
    scrollbar: {
      verticalScrollbarSize: 11,
      horizontalScrollbarSize: 11,
      useShadows: false,
    },
    overviewRulerLanes: 0,
    stickyScroll: { enabled: s.stickyScroll },
    occurrencesHighlight: 'off',
    selectionHighlight: false,
    quickSuggestions: s.quickSuggestions
      ? { other: true, comments: false, strings: false }
      : false,
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

  // settings → editor + theme (accent/theme rebuild Monaco theme)
  useEffect(() => {
    const s = ide.settings;
    applyCometTheme(ACCENT_PRESETS[s.accent], s.theme === 'dark');
    editorRef.current?.updateOptions(editorOptions(s));
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
    <>
      <div ref={hostRef} className="editor-host" />
      <CursorFX editorRef={editorRef} settings={ide.settings} />
    </>
  );
}
