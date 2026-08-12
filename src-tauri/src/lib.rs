use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use tauri::{Emitter, State};

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

// ═══════════════════════════════════════════════════════════════════════
//  PTY terminal (xterm.js ↔ real shell)
// ═══════════════════════════════════════════════════════════════════════

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn std::io::Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

struct PtyState(Mutex<HashMap<String, PtySession>>);

fn shell_command(shell: &str, cwd: &str) -> CommandBuilder {
    let program: String = match shell {
        "nu" => "nu".into(),
        "pwsh" => "pwsh".into(),
        "cmd" => "cmd.exe".into(),
        "zsh" => "zsh".into(),
        "fish" => "fish".into(),
        _ => {
            #[cfg(windows)]
            {
                "powershell.exe".into()
            }
            #[cfg(not(windows))]
            {
                std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into())
            }
        }
    };
    let mut cb = CommandBuilder::new(program);
    cb.cwd(cwd);
    cb
}

#[tauri::command]
fn pty_start(
    app: tauri::AppHandle,
    state: State<'_, PtyState>,
    shell: String,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let system = native_pty_system();
    let pair = system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let cmd = shell_command(&shell, &cwd);
    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("не удалось запустить '{}': {e}", shell))?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = format!(
        "t{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis()
    );

    state.0.lock().unwrap().insert(
        id.clone(),
        PtySession {
            master: pair.master,
            writer,
            child,
        },
    );

    // reader thread → emit output events to the frontend
    let app2 = app.clone();
    let id2 = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app2.emit(&format!("pty-out:{id2}"), text);
                }
            }
        }
        let _ = app2.emit(&format!("pty-exit:{id2}"), ());
    });

    Ok(id)
}

#[tauri::command]
fn pty_write(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    if let Some(s) = map.get_mut(&id) {
        s.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        s.writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_resize(
    state: State<'_, PtyState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    if let Some(s) = map.get_mut(&id) {
        s.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_kill(state: State<'_, PtyState>, id: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    if let Some(mut s) = map.remove(&id) {
        let _ = s.child.kill();
    }
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════
//  Tasks (run commands from config: build / run / test …)
// ═══════════════════════════════════════════════════════════════════════

#[tauri::command]
fn run_task(app: tauri::AppHandle, command: String, cwd: String) -> Result<String, String> {
    let id = format!(
        "task{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis()
    );
    let app2 = app.clone();
    let id2 = id.clone();
    let cwd2 = cwd.clone();
    let cmd2 = command.clone();

    std::thread::spawn(move || {
        let _ = app2.emit("task:start", (id2.clone(), cmd2.clone()));
        let result = {
            #[cfg(windows)]
            {
                std::process::Command::new("cmd")
                    .args(["/C", &cmd2])
                    .current_dir(&cwd2)
                    .output()
            }
            #[cfg(not(windows))]
            {
                std::process::Command::new("sh")
                    .args(["-c", &cmd2])
                    .current_dir(&cwd2)
                    .output()
            }
        };
        match result {
            Ok(out) => {
                let so = String::from_utf8_lossy(&out.stdout).into_owned();
                let se = String::from_utf8_lossy(&out.stderr).into_owned();
                if !so.is_empty() {
                    let _ = app2.emit("task:out", (id2.clone(), so));
                }
                if !se.is_empty() {
                    let _ = app2.emit("task:out", (id2.clone(), se));
                }
                let _ = app2.emit("task:exit", (id2.clone(), out.status.code().unwrap_or(-1)));
            }
            Err(e) => {
                let _ = app2.emit(
                    "task:out",
                    (id2.clone(), format!("Ошибка запуска: {e}\n")),
                );
                let _ = app2.emit("task:exit", (id2.clone(), -1));
            }
        }
    });

    Ok(id)
}

// ═══════════════════════════════════════════════════════════════════════
//  Git status (source control panel)
// ═══════════════════════════════════════════════════════════════════════

#[derive(Serialize)]
struct GitFile {
    path: String,
    status: String,
}

#[derive(Serialize)]
struct GitInfo {
    branch: Option<String>,
    files: Vec<GitFile>,
}

#[tauri::command]
fn git_status(cwd: String) -> Result<GitInfo, String> {
    let out = std::process::Command::new("git")
        .args(["status", "--porcelain=v1", "-uall"])
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("git: {e}"))?;
    if !out.status.success() {
        return Err("не git-репозиторий".into());
    }
    let branch = std::process::Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(&cwd)
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let text = String::from_utf8_lossy(&out.stdout).into_owned();
    let files = text
        .lines()
        .filter_map(|l| {
            if l.len() < 4 {
                return None;
            }
            let status = l[..2].trim().to_string();
            let path = l[3..].trim().to_string();
            if path.is_empty() {
                return None;
            }
            Some(GitFile { path, status })
        })
        .collect();

    Ok(GitInfo { branch, files })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PtyState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            list_dir,
            read_file,
            write_file,
            create_file,
            create_dir,
            delete_path,
            rename_path,
            pty_start,
            pty_write,
            pty_resize,
            pty_kill,
            run_task,
            git_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
