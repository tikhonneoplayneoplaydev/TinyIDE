// ─── Funo Language Plugin (TinyIDE WASM-плагин) ────────────────────────────
// Язык Funo → Java/JVM. Этот WASM-модуль регистрирует язык в TinyIDE и
// предоставляет: автодополнение, диагностику (check_source), транспиляцию
// в Java и outline (структуру документа). Работает и в десктопе (wasmi),
// и в браузере (нативный WebAssembly) — один и тот же бинарник.

mod funo;

use std::slice;

// ─── ABI: управление линейной памятью ─────────────────────────────────────

#[no_mangle]
pub extern "C" fn alloc(len: u32) -> u32 {
    let mut v = Vec::with_capacity(len as usize);
    let ptr = v.as_mut_ptr() as *mut u8 as u32;
    std::mem::forget(v);
    ptr
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: u32, len: u32) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr as *mut u8, len as usize, len as usize);
    }
}

// ─── ABI: главная точка входа ─────────────────────────────────────────────

#[no_mangle]
pub extern "C" fn tinyide_handle(
    cmd_ptr: u32,
    cmd_len: u32,
    out_ptr: u32,
    out_cap: u32,
) -> u32 {
    let cmd = unsafe { slice::from_raw_parts(cmd_ptr as *const u8, cmd_len as usize) };
    let cmd_str = String::from_utf8_lossy(cmd).into_owned();
    let response = handle(&cmd_str);
    let bytes = response.as_bytes();
    let cap = out_cap as usize;
    let n = bytes.len().min(cap);
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), out_ptr as *mut u8, n);
    }
    n as u32
}

fn handle(cmd: &str) -> String {
    let v: serde_json::Value = serde_json::from_str(cmd).unwrap_or_else(|_| serde_json::json!({ "cmd": "" }));
    match v["cmd"].as_str().unwrap_or("") {
        "init" => serde_json::json!({
            "languages": [{ "id": "funo", "extensions": [".fun", ".funo"], "aliases": ["Funo", "funo"] }],
            "commands": ["funo.check", "funo.transpile", "funo.outline"],
            "description": "Funo — язык, компилируемый в Java/JVM"
        })
        .to_string(),
        "completions" => completions(v["word"].as_str().unwrap_or("")),
        "diagnose" => {
            let src = v["source"].as_str().unwrap_or("");
            let diags = funo::check_source(src);
            serde_json::to_string(&diags).unwrap_or_else(|_| "[]".into())
        }
        "transpile" => {
            let src = v["source"].as_str().unwrap_or("");
            match funo::transpile(src) {
                Ok(java) => serde_json::json!({ "ok": true, "java": java }).to_string(),
                Err(diags) => serde_json::json!({ "ok": false, "errors": diags }).to_string(),
            }
        }
        "outline" => outline(v["source"].as_str().unwrap_or("")),
        _ => "{}".into(),
    }
}

// ─── автодополнение ────────────────────────────────────────────────────────

fn completions(word: &str) -> String {
    let w = word.to_lowercase();
    let all: Vec<serde_json::Value> = vec![
        json_comp("fun", "fun name(${1:arg}: ${2:int}) ${3:-> ${4:int}} {\n\t$0\n}", "Объявление функции", 3),
        json_comp("main", "fun main() {\n\t$0\n\treturn(200)\n}", "Точка входа", 3),
        json_comp("let", "let ${1:name} = ${2:value}", "Неизменяемая переменная", 6),
        json_comp("var", "var ${1:name} = ${2:value}", "Изменяемая переменная", 6),
        json_comp("const", "const ${1:NAME} = ${2:value}", "Константа", 6),
        json_comp("if", "if ${1:cond} {\n\t$0\n}", "Условие", 3),
        json_comp("if-else", "if ${1:cond} {\n\t$2\n} else {\n\t$0\n}", "Условие с else", 3),
        json_comp("while", "while ${1:cond} {\n\t$0\n}", "Цикл while", 3),
        json_comp("for", "for ${1:i} in ${2:0..10} {\n\t$0\n}", "Цикл for", 3),
        json_comp("repeat", "repeat ${1:5} {\n\t$0\n}", "Повтор N раз", 3),
        json_comp("println", "println(${1:value})", "Печать с новой строки", 2),
        json_comp("print", "print(${1:value})", "Печать без перевода строки", 2),
        json_comp("readInt", "readInt()", "Чтение целого числа", 2),
        json_comp("readln", "readln()", "Чтение строки", 2),
        json_comp("list", "list<${1:text}>(${2:items})", "Список", 5),
        json_comp("map", "map()", "Словарь", 5),
        json_comp("int", "int", "Целое число (32 бита)", 7),
        json_comp("text", "text", "Строка", 7),
        json_comp("bool", "bool", "Логическое значение", 7),
        json_comp("number", "number", "Число", 7),
    ];
    let filtered: Vec<&serde_json::Value> = if w.is_empty() {
        all.iter().collect()
    } else {
        all.iter()
            .filter(|c| c["label"].as_str().unwrap_or("").to_lowercase().contains(&w))
            .collect()
    };
    serde_json::json!({ "items": filtered }).to_string()
}

fn json_comp(label: &str, insert: &str, doc: &str, kind: u8) -> serde_json::Value {
    serde_json::json!({ "label": label, "insertText": insert, "documentation": doc, "kind": kind })
}

// ─── outline (структура документа) ─────────────────────────────────────────

fn outline(source: &str) -> String {
    let mut symbols = Vec::new();
    let re = match regex::Regex::new(r"(?m)^\s*fun\s+([A-Za-z_]\w*)\s*\(([^)]*)\)") {
        Ok(r) => r,
        Err(_) => return "[]".into(),
    };
    for cap in re.captures_iter(source) {
        let name = cap.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();
        let args = cap.get(2).map(|m| m.as_str().to_string()).unwrap_or_default();
        let line = source[..cap.get(0).unwrap().start()].matches('\n').count() + 1;
        symbols.push(serde_json::json!({
            "name": name,
            "detail": format!("fun {}({})", name, args),
            "line": line,
            "kind": 3
        }));
    }
    serde_json::to_string(&symbols).unwrap_or_else(|_| "[]".into())
}
