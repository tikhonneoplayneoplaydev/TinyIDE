use serde::Serialize;
use std::fs;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: Option<u64>,
}

/// List the contents of a directory (files and folders, dirs first).
/// Paths are normalized to forward slashes so the frontend can rely on '/'
/// separators on every platform (Windows uses backslashes natively).
#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let path = path.replace('\\', "/");
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let p = entry.path();
        let is_dir = p.is_dir();
        let size = if is_dir {
            None
        } else {
            p.metadata().ok().map(|m| m.len())
        };
        out.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: p.to_string_lossy().replace('\\', "/"),
            is_dir,
            size,
        });
    }
    out.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(out)
}

/// Read a file as text (lossy UTF-8 — binary files won't crash).
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    if fs::metadata(&path).is_ok() {
        return Err("file already exists".into());
    }
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_dir,
            read_file,
            write_file,
            create_file,
            create_dir,
            delete_path,
            rename_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
