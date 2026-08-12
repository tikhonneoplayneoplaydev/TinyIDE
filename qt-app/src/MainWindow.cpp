#include "MainWindow.h"

#include "Editor.h"

#include <QApplication>
#include <QFileSystemModel>
#include <QHeaderView>
#include <QPlainTextEdit>
#include <QSplitter>
#include <QStatusBar>
#include <QTabWidget>
#include <QTreeView>

MainWindow::MainWindow(QWidget* parent) : QMainWindow(parent) {
    setupDarkTheme();
    setupUi();
    setWindowTitle("TinyIDE (Qt)");
    statusBar()->showMessage("Готово — открой папку через меню Файл");
}

void MainWindow::setupUi() {
    auto* splitter = new QSplitter(Qt::Horizontal, this);

    // ── дерево файлов ─────────────────────────────────────────────────────
    m_fsModel = new QFileSystemModel(this);
    m_fsModel->setRootPath(QDir::currentPath());
    m_fsModel->setFilter(QDir::AllDirs | QDir::Files | QDir::NoDotAndDotDot);

    m_tree = new QTreeView(this);
    m_tree->setModel(m_fsModel);
    m_tree->setRootIndex(m_fsModel->index(QDir::currentPath()));
    m_tree->setHeaderHidden(true);
    m_tree->hideColumn(1);
    m_tree->hideColumn(2);
    m_tree->hideColumn(3);
    m_tree->setMinimumWidth(240);

    connect(m_tree, &QTreeView::doubleClicked, this, &MainWindow::openFileFromTree);

    // ── вкладки редактора ─────────────────────────────────────────────────
    m_tabs = new QTabWidget(this);
    m_tabs->setTabsClosable(true);
    m_tabs->setMovable(true);
    connect(m_tabs, &QTabWidget::tabCloseRequested, m_tabs, [this](int i) {
        QWidget* w = m_tabs->widget(i);
        m_tabs->removeTab(i);
        delete w;
    });

    splitter->addWidget(m_tree);
    splitter->addWidget(m_tabs);
    splitter->setStretchFactor(0, 0);
    splitter->setStretchFactor(1, 1);

    setCentralWidget(splitter);
}

void MainWindow::openFileFromTree(const QModelIndex& index) {
    const QString path = m_fsModel->filePath(index);
    if (m_fsModel->isDir(index)) return;

    // если файл уже открыт — переключаемся на вкладку
    for (int i = 0; i < m_tabs->count(); ++i) {
        if (m_tabs->tabText(i) == m_fsModel->fileName(index)) {
            m_tabs->setCurrentIndex(i);
            return;
        }
    }

    auto* editor = new Editor(path, this);
    int tab = m_tabs->addTab(editor, m_fsModel->fileName(index));
    m_tabs->setCurrentIndex(tab);
    statusBar()->showMessage(path);
}

void MainWindow::setupDarkTheme() {
    // тёмная палитра в духе кометной темы
    qApp->setStyleSheet(R"(
        QMainWindow, QWidget { background: #0b0e17; color: #dbe3f5; }
        QTreeView { background: #0d1120; alternate-background-color: #121829;
                    border: none; font-size: 13px; }
        QTreeView::item { padding: 3px 2px; border-radius: 6px; }
        QTreeView::item:hover { background: #182036; }
        QTreeView::item:selected { background: #1b2b52; color: #dbe3f5; }
        QTabWidget::pane { border: 1px solid #1e2740; background: #0b0e17; }
        QTabBar::tab { background: #0d1120; color: #aab6d4; padding: 6px 14px;
                       border: 1px solid #1e2740; border-bottom: none;
                       border-top-left-radius: 8px; border-top-right-radius: 8px; }
        QTabBar::tab:selected { background: #0b0e17; color: #67e8f9; }
        QPlainTextEdit { background: #0b0e17; color: #d5e0f7;
                         font-family: 'Cascadia Code', Consolas, monospace;
                         font-size: 14px; selection-background-color: #2a4d7a; }
        QStatusBar { background: #0d1120; color: #7c88a8; border-top: 1px solid #1e2740; }
        QMenuBar { background: #0d1120; color: #dbe3f5; }
        QMenu { background: #121829; color: #dbe3f5; border: 1px solid #2a3557; }
        QMenu::item:selected { background: #1b2b52; }
        QScrollBar:vertical { background: #0d1120; width: 11px; }
        QScrollBar::handle:vertical { background: #2a3555; border-radius: 5px; min-height: 24px; }
        QScrollBar::handle:vertical:hover { background: #38456e; }
    )");
}
