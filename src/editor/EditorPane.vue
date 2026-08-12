<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { languageForPath, applyCometTheme } from './monacoSetup';
import { ACCENT_PRESETS } from '../types';
import type { Settings } from '../types';
import { store, savedMap, cursorEmitter, setMonacoEditor } from '../store';
import { readFileText } from '../fs/bridge';
import CursorFX from './CursorFX.vue';

const hostRef = ref<HTMLDivElement | null>(null);
const editorRef = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
const models = new Map<string, monaco.editor.ITextModel>();
let loadingPath: string | null = null;
let monacoCreated = false;

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
    scrollbar: { verticalScrollbarSize: 11, horizontalScrollbarSize: 11, useShadows: false },
    overviewRulerLanes: 0,
    stickyScroll: { enabled: s.stickyScroll },
    occurrencesHighlight: 'off',
    selectionHighlight: false,
    quickSuggestions: s.quickSuggestions ? { other: true, comments: false, strings: false } : false,
    wordBasedSuggestions: 'currentDocument',
  };
}

onMounted(() => {
  const host = hostRef.value;
  if (!host) return;
  const editor = monaco.editor.create(host, {
    theme: store.settings.theme === 'dark' ? 'comet-dark' : 'comet-light',
    ...editorOptions(store.settings),
    automaticLayout: true,
  });
  editorRef.value = editor;
  setMonacoEditor(editor);

  editor.onDidChangeCursorPosition((e) => {
    cursorEmitter.emit({ line: e.position.lineNumber, col: e.position.column });
  });

  store.registerEditorApi({
    focus: () => editor.focus(),
    format: () => editor.getAction('editor.action.formatDocument')?.run(),
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

  monacoCreated = true;
});

onUnmounted(() => {
  store.registerEditorApi(null);
  setMonacoEditor(null);
  editorRef.value?.dispose();
  editorRef.value = null;
  monacoCreated = false;
});

// настройки → редактор + тема
watch(
  () => store.settings,
  (s) => {
    if (!monacoCreated) return;
    applyCometTheme(ACCENT_PRESETS[s.accent], s.theme === 'dark');
    editorRef.value?.updateOptions(editorOptions(s));
  },
  { deep: true }
);

// активный файл → модель
watch(
  () => [store.activePath, store.workspace] as const,
  async ([path, ws]) => {
    const editor = editorRef.value;
    if (!editor) return;
    if (!path) {
      editor.setModel(null);
      return;
    }
    const cached = models.get(path);
    if (cached) {
      editor.setModel(cached);
      return;
    }
    if (loadingPath === path) return;
    loadingPath = path;
    try {
      if (!ws) return;
      const content = await readFileText(ws, path);
      const lang = languageForPath(path);
      const model = monaco.editor.createModel(content, lang, monaco.Uri.parse('comet://' + path));
      models.set(path, model);
      savedMap.set(path, content);
      model.onDidChangeContent(() => {
        const saved = savedMap.get(path);
        if (saved !== undefined) store.setDirtyFor(path, model.getValue() !== saved);
      });
      if (store.activePath === path) {
        editor.setModel(model);
        editor.focus();
      }
    } catch (err) {
      console.error('open failed:', path, err);
      store.toast('Не удалось открыть ' + path);
    } finally {
      loadingPath = null;
    }
  }
);
</script>

<template>
  <div ref="hostRef" class="editor-host" />
  <CursorFX />
</template>
