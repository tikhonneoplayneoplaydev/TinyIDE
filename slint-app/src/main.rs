// TinyIDE — Slint: прототип нативного UI
// Бэкенд (Funo, git, OAuth, WASM-плагины) будет подключён из crate tinyide-core

slint::include_modules!();

use std::cell::RefCell;
use std::collections::HashMap;
use std::path::PathBuf;
use std::rc::Rc;

type Fs = HashMap<String, String>;

// ─── демо-файлы (виртуальный пример проекта) ──────────────────────────────
fn demo_workspace() -> (Vec<FileItem>, Fs) {
    let mut contents = HashMap::new();
    contents.insert(
        "/example-project/README.md".into(),
        "# Пример проекта TinyIDE\n\nОткрой файл слева. Терминал внизу — набери `help`.\n".into(),
    );
    contents.insert(
        "/example-project/funo/hello.fun".into(),
        "fun greet(name: text) -> text = \"Привет, \" + name\n\nfun main() {\n    println(greet(\"Funo\"))\n    return(200)\n}\n".into(),
    );
    contents.insert(
        "/example-project/funo/fib.fun".into(),
        "fun fib(n: int) -> int = if n < 2 then n else fib(n - 1) + fib(n - 2)\n\nfun main() {\n    println(fib(10))\n    return(200)\n}\n".into(),
    );
    contents.insert(
        "/example-project/src/main.rs".into(),
        "fn main() {\n    println!(\"Hello from TinyIDE!\");\n}\n".into(),
    );
    contents.insert(
        "/example-project/src/app.py".into(),
        "def main():\n    print('Hello from Python')\n\nif __name__ == '__main__':\n    main()\n".into(),
    );
    contents.insert(
        "/example-project/tinyide.toml".into(),
        "[appearance]\ntheme = \"dark\"\naccent = \"cyan\"\n\n[commands]\nbuild = \"npm run build\"\nrun = \"npm run dev\"\n".into(),
    );

    let items = vec![
        FileItem { name: "📁 example-project".into(), path: "/example-project".into(), is_dir: true, depth: 0 },
        FileItem { name: "README.md".into(), path: "/example-project/README.md".into(), is_dir: false, depth: 1 },
        FileItem { name: "tinyide.toml".into(), path: "/example-project/tinyide.toml".into(), is_dir: false, depth: 1 },
        FileItem { name: "📁 funo".into(), path: "/example-project/funo".into(), is_dir: true, depth: 1 },
        FileItem { name: "hello.fun".into(), path: "/example-project/funo/hello.fun".into(), is_dir: false, depth: 2 },
        FileItem { name: "fib.fun".into(), path: "/example-project/funo/fib.fun".into(), is_dir: false, depth: 2 },
        FileItem { name: "📁 src".into(), path: "/example-project/src".into(), is_dir: true, depth: 1 },
        FileItem { name: "main.rs".into(), path: "/example-project/src/main.rs".into(), is_dir: false, depth: 2 },
        FileItem { name: "app.py".into(), path: "/example-project/src/app.py".into(), is_dir: false, depth: 2 },
    ];
    (items, contents)
}

// ─── реальная папка через rfd ──────────────────────────────────────────────
fn load_folder(path: PathBuf) -> (Vec<FileItem>, Fs) {
    let mut items = vec![FileItem {
        name: format!("📁 {}", path.file_name().unwrap_or_default().to_string_lossy()).into(),
        path: path.to_string_lossy().into_owned().into(),
        is_dir: true,
        depth: 0,
    }];
    let mut contents = HashMap::new();
    if let Ok(rd) = std::fs::read_dir(&path) {
        for entry in rd.flatten() {
            let p = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            let is_dir = p.is_dir();
            if is_dir {
                items.push(FileItem { name: format!("📁 {name}").into(), path: p.to_string_lossy().into_owned().into(), is_dir: true, depth: 1 });
            } else if is_text(&p) {
                if let Ok(text) = std::fs::read_to_string(&p) {
                    contents.insert(p.to_string_lossy().into_owned(), text);
                }
                items.push(FileItem { name: name.into(), path: p.to_string_lossy().into_owned().into(), is_dir: false, depth: 1 });
            }
        }
    }
    (items, contents)
}

fn is_text(p: &PathBuf) -> bool {
    const EXT: &[&str] = &["rs", "toml", "fun", "md", "txt", "py", "js", "ts", "json", "yaml", "yml", "html", "css", "vue", "svelte"];
    match p.extension().and_then(|e| e.to_str()) {
        Some(e) => EXT.contains(&e.to_lowercase().as_str()),
        None => false,
    }
}

// ─── терминал (симуляция) ──────────────────────────────────────────────────
fn run_command(cmd: &str, out: &str) -> String {
    let mut res = format!("❯ {cmd}\n");
    let parts: Vec<&str> = cmd.trim().split_whitespace().collect();
    match parts.first().copied().unwrap_or("") {
        "help" => res.push_str("Команды: help, ls, pwd, echo, date, clear, funo, exit\n"),
        "ls" => res.push_str("README.md  tinyide.toml  funo/  src/\n"),
        "pwd" => res.push_str("/example-project\n"),
        "echo" => res.push_str(&format!("{}\n", parts[1..].join(" "))),
        "date" => res.push_str(&format!("{}\n", chrono_now())),
        "funo" => {
            res.push_str("╔═ TinyIDE · Funo ═╗\n");
            res.push_str("Язык Funo компилируется в Java/JVM.\n");
            res.push_str("Компилятор подключится из tinyide-core (Rust).\n");
        }
        "clear" => return String::new(),
        "exit" => res.push_str("[терминал закрыт]\n"),
        "" => {}
        other => res.push_str(&format!("Команда не найдена: {other}\n")),
    }
    let mut merged = format!("{out}{res}");
    if merged.chars().count() > 4000 {
        merged = merged.chars().skip(merged.chars().count() - 4000).collect();
    }
    merged
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    format!("unix {secs}")
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ui = MainWindow::new()?;

    // общее состояние: содержимое файлов
    let state: Rc<RefCell<Fs>> = Rc::new(RefCell::new(HashMap::new()));

    let (items, contents) = demo_workspace();
    *state.borrow_mut() = contents;
    ui.set_files(slint::ModelRc::new(slint::VecModel::from(items)));
    ui.set_editor_text(state.borrow().get("/example-project/README.md").cloned().unwrap_or_default().into());
    ui.set_active_file("/example-project/README.md".into());
    ui.set_terminal_output("TinyIDE terminal (slint-shell)\nНабери help — увидишь список команд.\n".into());
    ui.set_status_text("Ln 1, Col 1 · UTF-8".into());

    // открытие файла из дерева
    {
        let ui_weak = ui.as_weak();
        let state = state.clone();
        ui.on_file_clicked(move |path| {
            let ui = ui_weak.unwrap();
            let path_str = path.to_string();
            if let Some(text) = state.borrow().get(&path_str) {
                ui.set_editor_text(text.clone().into());
                ui.set_active_file(path_str.clone().into());
                ui.set_status_text(format!("открыт {path_str} · UTF-8").into());
            }
        });
    }

    // терминал
    {
        let ui_weak = ui.as_weak();
        ui.on_run_command(move |cmd| {
            let ui = ui_weak.unwrap();
            let out = ui.get_terminal_output().to_string();
            ui.set_terminal_output(run_command(&cmd, &out).into());
        });
    }

    // открыть папку (диалог rfd)
    {
        let ui_weak = ui.as_weak();
        let state = state.clone();
        ui.on_open_folder(move || {
            if let Some(dir) = rfd::FileDialog::new().pick_folder() {
                let ui = ui_weak.unwrap();
                let (items, contents) = load_folder(dir);
                *state.borrow_mut() = contents;
                ui.set_files(slint::ModelRc::new(slint::VecModel::from(items)));
                ui.set_status_text("папка открыта".into());
            }
        });
    }

    ui.run()?;
    Ok(())
}
