// Type shims for the modular Monaco ESM imports (keeps the bundle light —
// the full 'monaco-editor' entry pulls in every language and feature).

declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export * from 'monaco-editor';
}

declare module 'monaco-editor/esm/vs/editor/editor.all';
declare module 'monaco-editor/esm/vs/basic-languages/monaco.contribution';
declare module 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
declare module 'monaco-editor/esm/vs/language/json/monaco.contribution';
declare module 'monaco-editor/esm/vs/language/css/monaco.contribution';
declare module 'monaco-editor/esm/vs/language/html/monaco.contribution';
