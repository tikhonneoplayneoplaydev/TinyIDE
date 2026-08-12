// ─── Язык Funo для Monaco: подсветка синтаксиса ────────────────────────────
// Funo — язык, компилируемый в Java/JVM (github.com/vanyachickenganidanya-lgtm/funo-studio)

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

monaco.languages.register({
  id: 'funo',
  extensions: ['.fun', '.funo'],
  aliases: ['Funo', 'funo'],
});

monaco.languages.setLanguageConfiguration('funo', {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
});

monaco.languages.setMonarchTokensProvider('funo', {
  defaultToken: '',
  tokenPostfix: '.funo',

  keywords: [
    'fun', 'let', 'var', 'const', 'if', 'else', 'then', 'while', 'for', 'in',
    'repeat', 'break', 'continue', 'return', 'and', 'or', 'not', 'true', 'false',
    'null', 'import', 'from', 'as', 'class', 'this', 'super', 'new',
  ],

  typeKeywords: [
    'byte', 'short', 'int', 'long', 'float', 'double', 'number', 'text',
    'bool', 'char', 'any', 'list', 'set', 'map',
  ],

  builtins: [
    'println', 'print', 'readln', 'readInt', 'readLong', 'readDouble',
    'readBool', 'len', 'list', 'set', 'map', 'toString', 'toInt', 'range',
  ],

  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||',
    '++', '--', '+', '-', '*', '/', '&', '|', '^', '%', '<<', '>>', '>>>',
    '+=', '-=', '*=', '/=', '&=', '|=', '^=', '->', '..',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@builtins': 'predefined',
          '@default': 'identifier',
        },
      }],
      { include: '@whitespace' },
      [/\d+\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
      [/'[^\\']'/, 'string'],
      [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],
  },
});

// completion provider — подсказки по языку Funo
monaco.languages.registerCompletionItemProvider('funo', {
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position);
    const range = new monaco.Range(
      position.lineNumber,
      word.startColumn,
      position.lineNumber,
      word.endColumn
    );
    const kw = (label: string, insert: string, doc: string, kind: monaco.languages.CompletionItemKind) => ({
      label,
      insertText: insert,
      range,
      kind,
      detail: 'funo',
      documentation: doc,
    });
    return {
      suggestions: [
        kw('fun', 'fun name(${1:arg}: ${2:int}) ${3:-> ${4:int}} {\n\t$0\n}', 'Объявление функции', monaco.languages.CompletionItemKind.Function),
        kw('let', 'let ${1:name} = ${2:value}', 'Неизменяемая переменная', monaco.languages.CompletionItemKind.Variable),
        kw('var', 'var ${1:name} = ${2:value}', 'Изменяемая переменная', monaco.languages.CompletionItemKind.Variable),
        kw('const', 'const ${1:NAME} = ${2:value}', 'Константа', monaco.languages.CompletionItemKind.Variable),
        kw('if', 'if ${1:cond} {\n\t$0\n}', 'Условие', monaco.languages.CompletionItemKind.Snippet),
        kw('if-else', 'if ${1:cond} {\n\t$2\n} else {\n\t$0\n}', 'Условие с else', monaco.languages.CompletionItemKind.Snippet),
        kw('while', 'while ${1:cond} {\n\t$0\n}', 'Цикл while', monaco.languages.CompletionItemKind.Snippet),
        kw('for', 'for ${1:i} in ${2:0..10} {\n\t$0\n}', 'Цикл for', monaco.languages.CompletionItemKind.Snippet),
        kw('repeat', 'repeat ${1:5} {\n\t$0\n}', 'Повтор N раз', monaco.languages.CompletionItemKind.Snippet),
        kw('println', 'println(${1:value})', 'Печать с новой строки', monaco.languages.CompletionItemKind.Function),
        kw('print', 'print(${1:value})', 'Печать без перевода строки', monaco.languages.CompletionItemKind.Function),
        kw('readInt', 'readInt()', 'Чтение целого числа', monaco.languages.CompletionItemKind.Function),
        kw('readln', 'readln()', 'Чтение строки', monaco.languages.CompletionItemKind.Function),
        kw('list', 'list<${1:text}>(${2:items})', 'Список', monaco.languages.CompletionItemKind.Class),
        kw('map', 'map()', 'Словарь', monaco.languages.CompletionItemKind.Class),
        kw('main', 'fun main() {\n\t$0\n\treturn(200)\n}', 'Точка входа', monaco.languages.CompletionItemKind.Snippet),
        kw('int', 'int', 'Целое число (32 бита)', monaco.languages.CompletionItemKind.TypeParameter),
        kw('text', 'text', 'Строка', monaco.languages.CompletionItemKind.TypeParameter),
        kw('bool', 'bool', 'Логическое значение', monaco.languages.CompletionItemKind.TypeParameter),
        kw('number', 'number', 'Число (int/double авто)', monaco.languages.CompletionItemKind.TypeParameter),
      ],
    };
  },
});

// hover: краткая документация по ключевым словам
const HOVER_DOCS: Record<string, string> = {
  fun: '**fun** — объявление функции.\n```funo\nfun add(a: int, b: int) -> int = a + b\n```',
  let: '**let** — неизменяемая переменная с выводом типа.\n```funo\nlet adult: bool = age >= 18\n```',
  var: '**var** — изменяемая переменная.\n```funo\nvar attempts = 3\n```',
  const: '**const** — константа времени компиляции.',
  if: '**if/else** — условный оператор. Есть короткая форма:\n```funo\nif n < 2 then n else fib(n - 1)\n```',
  while: '**while** — цикл с условием.',
  for: '**for … in** — цикл по диапазону или коллекции.\n```funo\nfor i in 0..3 { println(rewards[i]) }\n```',
  repeat: '**repeat N { … }** — повторить N раз.',
  return: '**return(x)** — выход из функции; `return(200)` в main — успех.',
  println: '**println(x)** — печать значения с переводом строки.',
  readln: '**readln()** — ввод строки с консоли.',
  readInt: '**readInt()** — ввод целого числа.',
  list: '**list<T>** — изменяемый список с методами add/remove/get/contains.',
  set: '**set<T>** — множество уникальных значений.',
  map: '**map<K,V>** — словарь с методами put/get/containsKey.',
  text: '**text** — строковый тип (в JVM — String).',
  int: '**int** — 32-битное целое.',
  number: '**number** — число с плавающей точкой.',
  bool: '**bool** — true/false.',
};

monaco.languages.registerHoverProvider('funo', {
  provideHover(model, position) {
    const word = model.getWordAtPosition(position);
    if (!word) return null;
    const doc = HOVER_DOCS[word.word];
    if (!doc) return null;
    return {
      range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
      contents: [{ value: doc }],
    };
  },
});
