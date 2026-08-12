use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use tauri::{Emitter, State};

mod funo;
use base64::Engine as _;
use base64::engine::general_purpose;
mod plugins;

use plugins::PluginsState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: Option<u64>,
    canonical: Option<String>,
}

/// List the contents of a directory (files and folders, dirs first).
/// Paths are normalized to forward slashes so the frontend can rely on '/'
/// separators on every platform (Windows uses backslashes natively).
///
/// ВАЖНО (фикс зависаний): команда выполняется в пуле потоков tokio
/// (spawn_blocking), а НЕ на главном потоке Tauri. Синхронная команда на
/// главном потоке + fs::canonicalize для каждой записи могли вешать весь UI
/// (кнопки закрыть переставали работать). canonicalize теперь вызывается
/// только для поддиректорий и тоже в фоновом потоке.
#[tauri::command]
async fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || list_dir_inner(&path))
        .await
        .map_err(|e| e.to_string())?
}

fn list_dir_inner(path: &str) -> Result<Vec<DirEntry>, String> {
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
        // canonicalize — только для директорий (защита от циклов-джункшенов),
        // для файлов пропускаем: это самый дорогой системный вызов на Windows
        let canonical = if is_dir {
            fs::canonicalize(&p)
                .ok()
                .map(|c| c.to_string_lossy().replace('\\', "/"))
        } else {
            None
        };
        out.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: p.to_string_lossy().replace('\\', "/"),
            is_dir,
            size,
            canonical,
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
async fn read_file(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bytes = fs::read(&path).map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&bytes).to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || fs::write(&path, content).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn create_file(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if fs::metadata(&path).is_ok() {
            return Err("file already exists".into());
        }
        fs::write(&path, "").map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn create_dir(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || fs::create_dir_all(&path).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_path(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
        if meta.is_dir() {
            fs::remove_dir_all(&path).map_err(|e| e.to_string())
        } else {
            fs::remove_file(&path).map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
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

fn shell_command(shell: &str, command: Option<&str>, cwd: &str) -> CommandBuilder {
    let program: String = if let Some(cmd) = command {
        cmd.to_string()
    } else {
        match shell {
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
    command: Option<String>,
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

    let cmd = shell_command(&shell, command.as_deref(), &cwd);
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

#[derive(Serialize)]
struct RemoteInfo {
    url: Option<String>,
    host: Option<String>,
    branch: Option<String>,
    ahead: i64,
    behind: i64,
}

fn run_git(cwd: &str, args: &[String]) -> Result<String, String> {
    let out = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("git: {e}"))?;
    let mut text = String::from_utf8_lossy(&out.stdout).into_owned();
    text.push_str(&String::from_utf8_lossy(&out.stderr));
    let trimmed = text.trim().to_string();
    if out.status.success() {
        Ok(trimmed)
    } else {
        Err(trimmed)
    }
}

fn host_of_url(url: &str) -> Option<String> {
    let u = url
        .split("://")
        .nth(1)
        .or_else(|| url.split('@').nth(1))
        .unwrap_or(url);
    let host = u.split('/').next().unwrap_or("").to_string();
    if host.is_empty() {
        None
    } else {
        Some(host)
    }
}

/// Информация о remote (работает с любым git-провайдером: GitHub, GitLab, Bitbucket, Gitea…)
#[tauri::command]
async fn git_remote_info(cwd: String) -> Result<RemoteInfo, String> {
    tauri::async_runtime::spawn_blocking(move || git_remote_info_inner(&cwd))
        .await
        .map_err(|e| e.to_string())?
}

fn git_remote_info_inner(cwd: &str) -> Result<RemoteInfo, String> {
    let url = run_git(cwd, &[String::from("remote"), String::from("get-url"), String::from("origin")]).ok();
    let host = url.as_deref().and_then(host_of_url);
    let branch = run_git(cwd, &[String::from("branch"), String::from("--show-current")])
        .ok()
        .filter(|s| !s.is_empty());
    let mut ahead = 0i64;
    let mut behind = 0i64;
    if let Ok(sb) = run_git(cwd, &[String::from("status"), String::from("-sb")]) {
        if let Some(first) = sb.lines().next() {
            if let Some(idx) = first.find("[ahead ") {
                if let Some(rest) = first[idx + 7..].split(']').next() {
                    if let Ok(n) = rest.trim().parse::<i64>() {
                        ahead = n;
                    }
                }
            }
            if let Some(idx) = first.find("[behind ") {
                if let Some(rest) = first[idx + 8..].split(']').next() {
                    if let Ok(n) = rest.trim().parse::<i64>() {
                        behind = n;
                    }
                }
            }
        }
    }
    Ok(RemoteInfo {
        url,
        host,
        branch,
        ahead,
        behind,
    })
}

/// Клонирование любого git-репозитория по URL (https/ssh/git).
/// parent_dir — куда клонировать; вернёт путь к папке репозитория.
#[tauri::command]
async fn git_clone(url: String, parent_dir: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || git_clone_inner(&url, &parent_dir))
        .await
        .map_err(|e| e.to_string())?
}

fn git_clone_inner(url: &str, parent_dir: &str) -> Result<String, String> {
    let name = url
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("repo")
        .trim_end_matches(".git")
        .to_string();
    let target = format!("{}/{}", parent_dir.trim_end_matches('/'), name);
    run_git(
        &parent_dir,
        &[String::from("clone"), url.to_string(), target.clone()],
    )?;
    Ok(target)
}

fn git_auth_args(token: &str) -> Vec<String> {
    use base64::{Engine as _, engine::general_purpose};
    let b64 = base64::engine::general_purpose::STANDARD
        .encode(format!("x-access-token:{token}"));
    vec![
        String::from("-c"),
        format!("http.extraheader=Authorization: Basic {b64}"),
    ]
}

#[tauri::command]
async fn git_pull(cwd: String, token: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut args: Vec<String> = Vec::new();
        if let Some(t) = token {
            if !t.is_empty() {
                args.extend(git_auth_args(&t));
            }
        }
        args.push(String::from("pull"));
        run_git(&cwd, &args)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn git_push(cwd: String, token: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut args: Vec<String> = Vec::new();
        if let Some(t) = token {
            if !t.is_empty() {
                args.extend(git_auth_args(&t));
            }
        }
        args.push(String::from("push"));
        run_git(&cwd, &args)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn git_commit(cwd: String, message: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_git(&cwd, &[String::from("commit"), String::from("-m"), message])
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn git_init(cwd: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_git(&cwd, &[String::from("init")]))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn git_status(cwd: String) -> Result<GitInfo, String> {
    tauri::async_runtime::spawn_blocking(move || git_status_inner(&cwd))
        .await
        .map_err(|e| e.to_string())?
}

fn git_status_inner(cwd: &str) -> Result<GitInfo, String> {
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
        .current_dir(cwd)
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

// ═══════════════════════════════════════════════════════════════════════
//  Funo compiler (встроенный — язык Funo → Java/JVM)
// ═══════════════════════════════════════════════════════════════════════

/// Проверка исходника Funo: возвращает диагностику (без компиляции).
/// Выполняется в потоке tokio (spawn_blocking) — не блокирует IPC.
#[tauri::command]
async fn funo_check(source: String) -> Vec<funo::Diagnostic> {
    tauri::async_runtime::spawn_blocking(move || funo::check_source(&source))
        .await
        .unwrap_or_default()
}

/// Транспиляция Funo → Java-код (работает без установленной Java).
#[tauri::command]
async fn funo_transpile(source: String) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || match funo::transpile(&source) {
        Ok(java) => Ok(serde_json::json!({ "ok": true, "java": java })),
        Err(diags) => Ok(serde_json::json!({ "ok": false, "errors": diags })),
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Компиляция в .class/.jar (нужны javac/jar в PATH) + опциональный запуск.
#[tauri::command]
async fn funo_compile(
    source: String,
    project_root: String,
    run_after: bool,
) -> Result<serde_json::Value, String> {
    let result = tauri::async_runtime::spawn_blocking(move || {
        let cp = funo::discover_classpath(&project_root);
        if run_after {
            funo::compile_and_run(&project_root, &source, &cp)
        } else {
            funo::compile_only(&project_root, &source, &cp)
        }
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(&result).map_err(|e| e.to_string())?)
}

#[tauri::command]
async fn plugins_list(state: tauri::State<'_, PluginsState>) -> Result<Vec<plugins::PluginInfo>, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || plugins::plugins_list(&state))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn plugins_call(
    state: tauri::State<'_, PluginsState>,
    name: String,
    cmd: String,
) -> Result<String, String> {
    // wasmi-инстанс создаётся/вызывается в пуле потоков tokio
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || plugins::plugins_call(&state, &name, &cmd))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn plugins_install(source_dir: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || plugins::plugins_install(source_dir))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn plugins_uninstall(name: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || plugins::plugins_uninstall(name))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn plugins_dir() -> Result<String, String> {
    Ok(plugins::user_plugins_dir()?.to_string_lossy().into_owned())
}

/// Запись бинарного файла (base64) — для установки .wasm плагинов из маркета.
#[tauri::command]
fn write_binary(path: String, base64_data: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.trim())
        .map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}


// ═══════════════════════════════════════════════════════════════════════
//  Параллельный поиск по файлам (rayon) — не блокирует UI
// ═══════════════════════════════════════════════════════════════════════

#[derive(Serialize)]
struct SearchHit {
    path: String,
    name: String,
    line: u32,
    text: String,
}

const SKIP_SEARCH_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", "out", ".next", ".nuxt",
    ".cache", "__pycache__", ".venv", "vendor", ".parcel-cache", "coverage",
];

fn collect_files(dir: &std::path::Path, show_hidden: bool, depth: usize, out: &mut Vec<std::path::PathBuf>) {
    if depth > 8 {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let p = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if !show_hidden && name.starts_with('.') {
            continue;
        }
        if p.is_dir() {
            if SKIP_SEARCH_DIRS.contains(&name.as_str()) {
                continue;
            }
            collect_files(&p, show_hidden, depth + 1, out);
        } else {
            out.push(p);
        }
    }
}

/// Поиск по содержимому файлов рабочей папки, параллельно (rayon).
#[tauri::command]
async fn search_files_parallel(
    cwd: String,
    query: String,
    show_hidden: bool,
) -> Result<Vec<SearchHit>, String> {
    let q = query.to_lowercase();
    let hits = tauri::async_runtime::spawn_blocking(move || {
        let mut files = Vec::new();
        collect_files(std::path::Path::new(&cwd), show_hidden, 0, &mut files);
        use rayon::prelude::*;
        let grouped: Vec<Vec<SearchHit>> = files
            .par_iter()
            .filter_map(|p| {
                let meta = std::fs::metadata(p).ok()?;
                if meta.len() > 512_000 {
                    return None;
                }
                let content = std::fs::read_to_string(p).ok()?;
                let name = p.file_name()?.to_string_lossy().into_owned();
                let path = p.to_string_lossy().replace('\\', "/");
                let mut local: Vec<SearchHit> = Vec::new();
                for (i, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&q) {
                        local.push(SearchHit {
                            path: path.clone(),
                            name: name.clone(),
                            line: (i + 1) as u32,
                            text: line.trim().chars().take(160).collect(),
                        });
                        if local.len() >= 30 {
                            break;
                        }
                    }
                }
                if local.is_empty() {
                    None
                } else {
                    Some(local)
                }
            })
            .collect();
        grouped.into_iter().flatten().take(300).collect::<Vec<SearchHit>>()
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(hits)
}



// ═══════════════════════════════════════════════════════════════════════
//  GitHub OAuth (Device Flow) — вход без секрета и без сервера
// ═══════════════════════════════════════════════════════════════════════

#[derive(Serialize, serde::Deserialize)]
struct OAuthDeviceStart {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

fn http_client() -> reqwest::Client {
    // устанавливаем ring-провайдер для rustls (лёгкая сборка)
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    reqwest::Client::new()
}

/// Шаг 1: запросить код устройства.
#[tauri::command]
async fn oauth_github_start(client_id: String) -> Result<OAuthDeviceStart, String> {
    let resp = http_client()
        .post("https://github.com/login/device/code")
        .form(&[("client_id", client_id.as_str()), ("scope", "repo read:user")])
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
        return Err(err.to_string());
    }
    serde_json::from_value(v).map_err(|e| e.to_string())
}

/// Шаг 2: опросить токен (пока пользователь не подтвердит код).
#[tauri::command]
async fn oauth_github_token(client_id: String, device_code: String) -> Result<serde_json::Value, String> {
    let resp = http_client()
        .post("https://github.com/login/oauth/access_token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("device_code", device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    resp.json().await.map_err(|e| e.to_string())
}

/// Профиль пользователя GitHub по токену.
#[tauri::command]
async fn github_user(token: String) -> Result<serde_json::Value, String> {
    let resp = http_client()
        .get("https://api.github.com/user")
        .bearer_auth(&token)
        .header("User-Agent", "TinyIDE")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    resp.json().await.map_err(|e| e.to_string())
}

/// Открыть URL в системном браузере.
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    open_url_inner(&url)
}

fn open_url_inner(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", ""])
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(url).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open").arg(url).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}



// ═══════════════════════════════════════════════════════════════════════
//  GitHub OAuth — Authorization Code Flow + PKCE через локальный callback
//  http://localhost:1250/callback
//  Схема: сервер поднимается -> браузер авторизует -> GitHub редиректит
//  на localhost -> сервер получает code, отвечает HTML и МОМЕНТАЛЬНО
//  убивает себя -> код обменивается на токен -> токен ШИФРУЕТСЯ
//  (Argon2id -> ключ, ChaCha20-Poly1305) и сохраняется в oauth.bin
// ═══════════════════════════════════════════════════════════════════════

use argon2::Argon2;
use argon2::password_hash::rand_core::{OsRng, RngCore};
use chacha20poly1305::{ChaCha20Poly1305, KeyInit, aead::Aead};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::net::TcpListener;

const OAUTH_PORT: u16 = 1250;
const OAUTH_CALLBACK: &str = "http://localhost:1250/callback";
const OAUTH_TIMEOUT_SECS: u64 = 180;

fn data_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    let dir = std::path::PathBuf::from(home).join(".tinyide");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Ключ шифрования: мастер-пароль (Argon2id) ИЛИ файловый ключ secret.key
fn get_encryption_key(master_password: Option<&str>, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    if let Some(pw) = master_password {
        if pw.is_empty() {
            return Err("мастер-пароль пуст".into());
        }
        Argon2::default()
            .hash_password_into(pw.as_bytes(), salt, &mut key)
            .map_err(|e| format!("argon2: {e}"))?;
    } else {
        let path = data_dir()?.join("secret.key");
        if path.exists() {
            let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
            if bytes.len() != 32 {
                return Err("secret.key повреждён".into());
            }
            key.copy_from_slice(&bytes);
        } else {
            OsRng.fill_bytes(&mut key);
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::write(&path, &key).map_err(|e| e.to_string())?;
                let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
            }
            #[cfg(not(unix))]
            {
                std::fs::write(&path, &key).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(key)
}

/// Шифрование данных: Argon2id-ключ + ChaCha20-Poly1305
fn encrypt_data(plain: &str, master_password: Option<&str>) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    let key = get_encryption_key(master_password, &salt)?;
    let cipher = ChaCha20Poly1305::new_from_slice(&key).map_err(|e| format!("cipher: {e}"))?;
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    let ct = cipher
        .encrypt(chacha20poly1305::aead::Nonce::<chacha20poly1305::ChaCha20Poly1305>::from_slice(&nonce), plain.as_bytes())
        .map_err(|e| format!("encrypt: {e}"))?;
    let mut out = Vec::with_capacity(16 + 12 + ct.len());
    out.extend_from_slice(&salt);
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Расшифровка: salt(16) || nonce(12) || ct
fn decrypt_data(data: &[u8], master_password: Option<&str>) -> Result<String, String> {
    if data.len() < 28 {
        return Err("oauth.bin повреждён".into());
    }
    let salt = &data[..16];
    let nonce = &data[16..28];
    let ct = &data[28..];
    let key = get_encryption_key(master_password, salt)?;
    let cipher = ChaCha20Poly1305::new_from_slice(&key).map_err(|e| format!("cipher: {e}"))?;
    let pt = cipher
        .decrypt(chacha20poly1305::aead::Nonce::<chacha20poly1305::ChaCha20Poly1305>::from_slice(nonce), ct)
        .map_err(|_| "расшифровать не удалось (неверный мастер-пароль?)")?;
    String::from_utf8(pt).map_err(|e| e.to_string())
}

fn save_oauth_token(token: &str, login: &str, master_password: Option<&str>) -> Result<(), String> {
    let encrypted = encrypt_data(&format!("{token}\n{login}"), master_password)?;
    let path = data_dir()?.join("oauth.bin");
    std::fs::write(&path, &encrypted).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

fn load_oauth_token(master_password: Option<&str>) -> Result<(String, String), String> {
    let path = data_dir()?.join("oauth.bin");
    if !path.exists() {
        return Err("нет сохранённого входа".into());
    }
    let data = std::fs::read(&path).map_err(|e| e.to_string())?;
    let plain = decrypt_data(&data, master_password)?;
    let mut lines = plain.lines();
    let token = lines.next().unwrap_or("").to_string();
    let login = lines.next().unwrap_or("").to_string();
    if token.is_empty() {
        return Err("oauth.bin пуст".into());
    }
    Ok((token, login))
}

fn urlencode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

/// Чтение HTTP-запроса: вернёт path с query (например /callback?code=..&state=..)
fn read_http_request(stream: &mut std::net::TcpStream) -> Result<String, String> {
    let mut buf = [0u8; 8192];
    let mut data = Vec::new();
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(10)))
        .map_err(|e| e.to_string())?;
    loop {
        let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        data.extend_from_slice(&buf[..n]);
        if data.windows(4).any(|w| w == b"\r\n\r\n") {
            break;
        }
        if data.len() > 8192 {
            break;
        }
    }
    let text = String::from_utf8_lossy(&data).into_owned();
    Ok(text
        .lines()
        .next()
        .unwrap_or("")
        .split(' ')
        .nth(1)
        .unwrap_or("/")
        .to_string())
}

fn send_http(stream: &mut std::net::TcpStream, body: &str) {
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(resp.as_bytes());
    let _ = stream.flush();
}

/// Полный флоу: поднять сервер -> браузер -> callback -> убить сервер -> токен
#[tauri::command]
async fn oauth_github_authorize(client_id: String, master_password: Option<String>) -> Result<serde_json::Value, String> {
    // PKCE: verifier + challenge
    let mut ver_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut ver_bytes);
    let verifier = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(ver_bytes);
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));

    // state (случайный hex)
    let mut st = [0u8; 16];
    OsRng.fill_bytes(&mut st);
    let state: String = st.iter().map(|b| format!("{b:02x}")).collect();

    // listener на 127.0.0.1:1250
    let listener = TcpListener::bind(("127.0.0.1", OAUTH_PORT)).map_err(|e| {
        format!("не удалось занять порт {OAUTH_PORT} (занят?): {e}")
    })?;

    // URL авторизации
    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope={}&state={}&code_challenge={}&code_challenge_method=S256",
        urlencode(&client_id),
        urlencode(OAUTH_CALLBACK),
        urlencode("repo read:user"),
        state,
        challenge
    );
    open_url_inner(&auth_url)?;

    // ─── сервер живёт ровно до первого callback, потом умирает ────────────
    let code: Result<String, String> = std::thread::spawn(move || {
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(OAUTH_TIMEOUT_SECS);
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        loop {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let req = read_http_request(&mut stream)?;
                    if req.starts_with("/callback") {
                        let q: std::collections::HashMap<String, String> = req
                            .split('?')
                            .nth(1)
                            .unwrap_or("")
                            .split('&')
                            .filter_map(|kv| {
                                let mut it = kv.split('=');
                                let k = it.next()?.to_string();
                                let v = it.next().unwrap_or("").to_string();
                                Some((k, v))
                            })
                            .collect();
                        let cb_state = q.get("state").cloned().unwrap_or_default();
                        if cb_state != state {
                            // Это callback от СТАРОЙ попытки входа (например, браузер
                            // открыл сохранённую вкладку). Игнорируем и ЖДЁМ дальше —
                            // убивать сервер нельзя, иначе новая правильная попытка
                            // останется без обработки.
                            send_http(
                                &mut stream,
                                "<html><body style='font-family:sans-serif;text-align:center;padding:50px'><h3>Это устаревший запрос входа.</h3><p>Если ты только что нажал «Войти» в TinyIDE — закрой эту вкладку, новый запрос уже обрабатывается.</p></body></html>",
                            );
                            continue;
                        }
                        let code = q.get("code").cloned().unwrap_or_default();
                        if code.is_empty() {
                            send_http(&mut stream, "<h2>Ошибка: нет code в ответе GitHub</h2>");
                            return Err("no code".into());
                        }
                        send_http(
                            &mut stream,
                            "<html><body style='font-family:sans-serif;text-align:center;padding:60px'><h2>✅ Вход в TinyIDE выполнен!</h2><p>Это окно можно закрыть.</p></body></html>",
                        );
                        return Ok(code);
                    } else {
                        send_http(&mut stream, "<h2>404 — это локальный callback TinyIDE</h2>");
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    if std::time::Instant::now() > deadline {
                        return Err("время ожидания истекло (120 с) — повторите вход".into());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
                Err(e) => return Err(e.to_string()),
            }
        }
    })
    .join()
    .map_err(|_| "сервер callback упал".to_string())?;

    let code = code?; // сервер уже убит (поток завершился)

    // обмен code -> токен (PKCE, секрет не нужен)
    let resp = http_client()
        .post("https://github.com/login/oauth/access_token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("code", code.as_str()),
            ("redirect_uri", OAUTH_CALLBACK),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier.as_str()),
        ])
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let token = v
        .get("access_token")
        .and_then(|t| t.as_str())
        .ok_or_else(|| v.get("error_description").and_then(|e| e.as_str()).unwrap_or("нет токена").to_string())?
        .to_string();

    // профиль
    let user: serde_json::Value = http_client()
        .get("https://api.github.com/user")
        .bearer_auth(&token)
        .header("User-Agent", "TinyIDE")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let login = user.get("login").and_then(|l| l.as_str()).unwrap_or("").to_string();

    // шифруем и сохраняем (Argon2id -> ключ, ChaCha20-Poly1305)
    save_oauth_token(&token, &login, master_password.as_deref())?;

    Ok(serde_json::json!({ "token": token, "login": login }))
}

/// Загрузить сохранённый (зашифрованный) вход.
#[tauri::command]
async fn github_load_auth(master_password: Option<String>) -> Result<serde_json::Value, String> {
    match load_oauth_token(master_password.as_deref()) {
        Ok((token, login)) => Ok(serde_json::json!({ "token": token, "login": login })),
        Err(_) => Ok(serde_json::json!({ "token": "", "login": "" })),
    }
}

/// Удалить сохранённый вход.
#[tauri::command]
async fn github_logout_local() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(github_logout_local_inner)
        .await
        .map_err(|e| e.to_string())?
}

fn github_logout_local_inner() -> Result<(), String> {
    let path = data_dir()?.join("oauth.bin");
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PtyState(Mutex::new(HashMap::new())))
        .manage(PluginsState::new())
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
            git_status,
            git_remote_info,
            git_clone,
            git_pull,
            git_push,
            git_commit,
            git_init,
            funo_check,
            funo_transpile,
            funo_compile,
            plugins_list,
            plugins_call,
            plugins_install,
            plugins_uninstall,
            plugins_dir,
            write_binary,
            search_files_parallel,
            oauth_github_start,
            oauth_github_token,
            github_user,
            open_url,
            oauth_github_authorize,
            github_load_auth,
            github_logout_local
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
