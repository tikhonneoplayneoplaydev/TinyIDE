// ─── WASM-плагины: хост (wasmi) ───────────────────────────────────────────
// Плагины TinyIDE — это WebAssembly-модули с ABI:
//   alloc(len) -> ptr, dealloc(ptr, len),
//   tinyide_handle(cmd_ptr, cmd_len, out_ptr, out_cap) -> len (JSON-ответ)
// Встроенные плагины компилируются в бинарник (include_bytes!),
// пользовательские лежат в app_data_dir/plugins/<name>/.

use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use wasmi::{Engine, Linker, Memory, Module, Store, TypedFunc};

const BUILTIN_PLUGINS: &[(&str, &[u8])] = &[("funo", include_bytes!("../plugins/funo/plugin.wasm"))];

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub name: String,
    pub display_name: String,
    pub publisher: String,
    pub version: String,
    pub description: String,
    pub builtin: bool,
    pub size_kb: u64,
}

pub struct PluginsState {
    pub map: Mutex<HashMap<String, WasmPlugin>>,
}

impl PluginsState {
    pub fn new() -> Self {
        PluginsState {
            map: Mutex::new(HashMap::new()),
        }
    }
}

// для доступа из lib.rs
pub use wasmi;

struct WasmPlugin {
    store: Store<()>,
    memory: Memory,
    alloc: TypedFunc<i32, i32>,
    handle: TypedFunc<(i32, i32, i32, i32), i32>,
}

fn parse_toml_meta(dir: &PathBuf) -> Option<(String, String, String, String, String)> {
    let toml = fs::read_to_string(dir.join("plugin.toml")).ok()?;
    let get = |k: &str| -> String {
        toml.lines()
            .find(|l| l.starts_with(k))
            .map(|l| l.split('=').nth(1).unwrap_or("").trim().trim_matches('"').to_string())
            .unwrap_or_default()
    };
    Some((
        get("name"),
        get("display_name"),
        get("publisher"),
        get("version"),
        get("description"),
    ))
}

fn instantiate(bytes: &[u8]) -> Result<WasmPlugin, String> {
    let engine = Engine::default();
    let module = Module::new(&engine, bytes).map_err(|e| e.to_string())?;
    let mut store = Store::new(&engine, ());
    let mut linker: Linker<()> = Linker::new(&engine);
    linker
        .func_wrap("env", "log", |_: wasmi::Caller<'_, ()>, _ptr: i32, _len: i32| {})
        .map_err(|e| e.to_string())?;
    let instance = linker
        .instantiate_and_start(&mut store, &module)
        .map_err(|e| e.to_string())?;
    let memory = instance
        .get_memory(&store, "memory")
        .ok_or_else(|| "plugin: нет экспортируемой памяти 'memory'".to_string())?;
    let alloc = instance
        .get_typed_func::<i32, i32>(&store, "alloc")
        .map_err(|e| e.to_string())?;
    let handle = instance
        .get_typed_func::<(i32, i32, i32, i32), i32>(&store, "tinyide_handle")
        .map_err(|e| e.to_string())?;
    Ok(WasmPlugin {
        store,
        memory,
        alloc,
        handle,
    })
}

fn call(plugin: &mut WasmPlugin, cmd: &str) -> Result<String, String> {
    let cmd_bytes = cmd.as_bytes();
    let cmd_ptr = plugin
        .alloc
        .call(&mut plugin.store, cmd_bytes.len() as i32)
        .map_err(|e| e.to_string())?;
    plugin
        .memory
        .write(&mut plugin.store, cmd_ptr as usize, cmd_bytes)
        .map_err(|e| e.to_string())?;

    const OUT_CAP: usize = 1 << 20; // 1 МБ
    let out_ptr = plugin
        .alloc
        .call(&mut plugin.store, OUT_CAP as i32)
        .map_err(|e| e.to_string())?;
    let n = plugin
        .handle
        .call(&mut plugin.store, (cmd_ptr, cmd_bytes.len() as i32, out_ptr, OUT_CAP as i32))
        .map_err(|e| e.to_string())?;
    let data = plugin
        .memory
        .data(&plugin.store)
        .get(out_ptr as usize..out_ptr as usize + n as usize)
        .ok_or_else(|| "plugin: выход за границы памяти".to_string())?
        .to_vec();
    Ok(String::from_utf8_lossy(&data).into_owned())
}

/// Вызов команды плагина (кэширует инстанс).
pub fn plugins_call(state: &PluginsState, name: &str, cmd: &str) -> Result<String, String> {
    let mut map = state.map.lock().unwrap();
    if !map.contains_key(name) {
        let bytes = plugin_bytes(name)?;
        let plugin = instantiate(&bytes)?;
        map.insert(name.to_string(), plugin);
    }
    let plugin = map.get_mut(name).unwrap();
    let res = call(plugin, cmd)?;
    // инициализация плагина при первом вызове
    Ok(res)
}

fn plugin_bytes(name: &str) -> Result<Vec<u8>, String> {
    if let Some((_, bytes)) = BUILTIN_PLUGINS.iter().find(|(n, _)| *n == name) {
        return Ok(bytes.to_vec());
    }
    let dir = user_plugins_dir()?.join(name);
    let bytes = fs::read(dir.join("plugin.wasm")).map_err(|e| e.to_string())?;
    Ok(bytes)
}

pub fn user_plugins_dir() -> Result<PathBuf, String> {
    let base = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    Ok(PathBuf::from(base).join(".tinyide").join("plugins"))
}

/// Список плагинов: встроенные + установленные пользователем.
pub fn plugins_list(state: &PluginsState) -> Vec<PluginInfo> {
    let mut out = Vec::new();
    for (name, bytes) in BUILTIN_PLUGINS {
        // держим lock неявно: список не трогает map
        out.push(PluginInfo {
            name: name.to_string(),
            display_name: "Funo Language".into(),
            publisher: "TinyIDE".into(),
            version: "1.0.0".into(),
            description: "Funo — язык, компилируемый в Java/JVM. Автодополнение, диагностика, транспиляция, outline.".into(),
            builtin: true,
            size_kb: (bytes.len() / 1024) as u64,
        });
    }
    if let Ok(dir) = user_plugins_dir() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for e in entries.flatten() {
                let p = e.path();
                if !p.is_dir() {
                    continue;
                }
                let name = p.file_name().unwrap_or_default().to_string_lossy().into_owned();
                if BUILTIN_PLUGINS.iter().any(|(n, _)| *n == name) {
                    continue;
                }
                if let Some((dn, pub_, ver, desc)) = parse_toml_meta(&p).map(|m| (m.1, m.2, m.3, m.4)) {
                    let name2 = name.clone();
                    let size = fs::metadata(p.join("plugin.wasm")).map(|m| (m.len() / 1024) as u64).unwrap_or(0);
                    out.push(PluginInfo {
                        name: name2,
                        display_name: if dn.is_empty() { name.clone() } else { dn },
                        publisher: if pub_.is_empty() { "unknown".into() } else { pub_ },
                        version: if ver.is_empty() { "0.0.0".into() } else { ver },
                        description: desc,
                        builtin: false,
                        size_kb: size,
                    });
                }
            }
        }
    }
    out
}

/// Установка плагина из папки (plugin.toml + plugin.wasm) в ~/.tinyide/plugins/<name>.
pub fn plugins_install(source_dir: String) -> Result<String, String> {
    let src = PathBuf::from(source_dir);
    let toml = fs::read_to_string(src.join("plugin.toml")).map_err(|e| e.to_string())?;
    if !src.join("plugin.wasm").exists() {
        return Err("в папке нет plugin.wasm".into());
    }
    let name = toml
        .lines()
        .find(|l| l.starts_with("name"))
        .map(|l| l.split('=').nth(1).unwrap_or("").trim().trim_matches('"').to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "в plugin.toml нет поля name".to_string())?;
    if BUILTIN_PLUGINS.iter().any(|(n, _)| *n == name) {
        return Err("плагин с таким именем уже встроен".into());
    }
    let dest = user_plugins_dir()?.join(&name);
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;
    fs::copy(src.join("plugin.toml"), dest.join("plugin.toml")).map_err(|e| e.to_string())?;
    fs::copy(src.join("plugin.wasm"), dest.join("plugin.wasm")).map_err(|e| e.to_string())?;
    Ok(name)
}

pub fn plugins_uninstall(name: String) -> Result<(), String> {
    if BUILTIN_PLUGINS.iter().any(|(n, _)| *n == name) {
        return Err("встроенные плагины нельзя удалить".into());
    }
    let dir = user_plugins_dir()?.join(&name);
    if !dir.exists() {
        return Err("плагин не найден".into());
    }
    fs::remove_dir_all(&dir).map_err(|e| e.to_string())
}
