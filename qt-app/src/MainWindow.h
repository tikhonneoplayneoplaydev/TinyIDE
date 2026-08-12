#pragma once

#include <QMainWindow>

class QFileSystemModel;
class QTreeView;
class QTabWidget;
class QPlainTextEdit;

// Главное окно TinyIDE (Qt): слева дерево файлов, по центру вкладки редактора,
// снизу статус-бар. Бэкенд (Funo, git, OAuth) подключится через Rust-ядро (C ABI).
class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);

private slots:
    void openFileFromTree(const QModelIndex& index);

private:
    void setupUi();
    void setupDarkTheme();

    QFileSystemModel* m_fsModel = nullptr;
    QTreeView* m_tree = nullptr;
    QTabWidget* m_tabs = nullptr;
};
