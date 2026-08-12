#pragma once

#include <QPlainTextEdit>

class QSyntaxHighlighter;

// Редактор: QPlainTextEdit + номер строк + подсветка по расширению файла.
class Editor : public QPlainTextEdit {
    Q_OBJECT

public:
    explicit Editor(const QString& filePath, QWidget* parent = nullptr);

    void lineNumberAreaPaintEvent(QPaintEvent* event);
    int lineNumberAreaWidth() const;
    void updateLineNumberAreaWidth();

protected:
    void resizeEvent(QResizeEvent* event) override;

private:
    QWidget* m_lineNumberArea = nullptr;
    QSyntaxHighlighter* m_highlighter = nullptr;
    QString m_filePath;
};

// ─── область номеров строк ────────────────────────────────────────────────
class LineNumberArea : public QWidget {
public:
    explicit LineNumberArea(Editor* editor) : QWidget(editor), m_editor(editor) {}
    QSize sizeHint() const override { return QSize(m_editor->lineNumberAreaWidth(), 0); }

protected:
    void paintEvent(QPaintEvent* event) override {
        m_editor->lineNumberAreaPaintEvent(event);
    }

private:
    Editor* m_editor;
};
