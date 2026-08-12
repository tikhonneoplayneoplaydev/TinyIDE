// ─── Funo language compiler module ─────────────────────────────────────────
// Источник: https://github.com/vanyachickenganidanya-lgtm/funo-studio
// (ветка arena/019ff460-funo-studio, файлы src-tauri/src/{compiler,models,process}.rs)
// Funo — язык, компилируемый в Java/JVM.

pub mod compiler;
pub mod models;
pub mod process;

pub use compiler::{
    check_source, compile_and_run, compile_only, discover_classpath, transpile,
};
pub use models::{BuildResult, Diagnostic};
