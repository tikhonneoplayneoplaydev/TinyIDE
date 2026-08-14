fn main() {
    // тёмная тема std-widgets (System76 Cosmic)
    std::env::set_var("SLINT_STYLE", "cosmic");
    slint_build::compile("ui/main.slint").unwrap();
}
