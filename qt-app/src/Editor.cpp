#include "Editor.h"
#include "FunoHighlighter.h"

#include <QFile>
#include <QPainter>
#include <QTextStream>

Editor::Editor(const QString& filePath, QWidget* parent)
    : QPlainTextEdit(parent), m_filePath(filePath) {
    m_lineNumberArea = new LineNumberArea(this);

    connect(this, &QPlainTextEdit::blockCountChanged, this,
            [this](int) { m_lineNumberArea->update(); });
    connect(this, &QPlainTextEdit::updateRequest, this,
            [this](const QRect& rect, int dy) {
                if (dy) {
                    m_lineNumberArea->scroll(0, dy);
                } else {
                    m_lineNumberArea->update(0, rect.y(), m_lineNumberArea->width(), rect.height());
                }
            });
    connect(this, &QPlainTextEdit::cursorPositionChanged, this,
            [this] { m_lineNumberArea->update(); });

    // загрузка файла
    QFile f(filePath);
    if (f.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream ts(&f);
        ts.setEncoding(QStringConverter::Utf8);
        setPlainText(ts.readAll());
        f.close();
    }

    // подсветка: Funo (.fun), иначе — простой лексер по расширению
    if (filePath.endsWith(".fun") || filePath.endsWith(".funo")) {
        m_highlighter = new FunoHighlighter(document());
    }

    setLineWrapMode(QPlainTextEdit::NoWrap);
    setTabStopDistance(4 * fontMetrics().horizontalAdvance(' '));
    updateLineNumberAreaWidth();
}

int Editor::lineNumberAreaWidth() const {
    int digits = 1;
    int max = qMax(1, blockCount());
    while (max >= 10) {
        max /= 10;
        ++digits;
    }
    return 12 + fontMetrics().horizontalAdvance('9') * digits;
}

void Editor::updateLineNumberAreaWidth() {
    setViewportMargins(lineNumberAreaWidth(), 0, 0, 0);
}

void Editor::resizeEvent(QResizeEvent* event) {
    QPlainTextEdit::resizeEvent(event);
    const QRect cr = contentsRect();
    m_lineNumberArea->setGeometry(QRect(cr.left(), cr.top(), lineNumberAreaWidth(), cr.height()));
}

void Editor::lineNumberAreaPaintEvent(QPaintEvent* event) {
    QPainter painter(m_lineNumberArea);
    painter.fillRect(event->rect(), QColor(0x0d, 0x11, 0x20));

    QTextBlock block = firstVisibleBlock();
    int blockNumber = block.blockNumber();
    int top = qRound(blockBoundingGeometry(block).translated(contentOffset()).top());
    int bottom = top + qRound(blockBoundingRect(block).height());

    while (block.isValid() && top <= event->rect().bottom()) {
        if (block.isVisible() && bottom >= event->rect().top()) {
            painter.setPen(QColor(0x3d, 0x4a, 0x6b));
            painter.drawText(0, top, m_lineNumberArea->width() - 8, fontMetrics().height(),
                             Qt::AlignRight, QString::number(blockNumber + 1));
        }
        block = block.next();
        top = bottom;
        bottom = top + qRound(blockBoundingRect(block).height());
        ++blockNumber;
    }
}
