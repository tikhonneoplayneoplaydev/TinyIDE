#include "TerminalWidget.h"

#include <QDateTime>
#include <QKeyEvent>
#include <QScrollBar>

TerminalWidget::TerminalWidget(QWidget* parent) : QPlainTextEdit(parent) {
    setReadOnly(true);
    setLineWrapMode(QPlainTextEdit::NoWrap);
    setMaximumBlockCount(5000);
    setStyleSheet(
        "QPlainTextEdit { background: #0b0e17; color: #d5e0f7;"
        " font-family: 'Cascadia Code', Consolas, monospace; font-size: 13px; }");
}

QStringList TerminalWidget::availableShells() {
    QStringList shells;
#ifdef Q_OS_WIN
    shells << "cmd.exe"
           << "powershell.exe"
           << "pwsh.exe"
           << "nu.exe";
#else
    shells << "/bin/bash"
           << "/bin/zsh"
           << "/bin/fish"
           << "nu";
#endif
    return shells;
}

void TerminalWidget::startShell(const QString& shell) {
    stop();
    m_shellName = shell;
    m_proc = new QProcess(this);
    connect(m_proc, &QProcess::readyReadStandardOutput, this, &TerminalWidget::onOutput);
    connect(m_proc, &QProcess::readyReadStandardError, this, &TerminalWidget::onOutput);
    connect(m_proc, &QProcess::finished, this, &TerminalWidget::onProcessExit);

    clear();
    appendHtml("<span style='color:#67e8f9'>TinyIDE terminal — "
               + shell.toHtmlEscaped()
               + "</span><br>");
    m_proc->start(shell);
    if (!m_proc->waitForStarted(2000)) {
        appendHtml("<span style='color:#f87171'>Не удалось запустить "
                   + shell.toHtmlEscaped() + "</span><br>");
        m_proc->deleteLater();
        m_proc = nullptr;
        return;
    }
    appendPrompt();
}

void TerminalWidget::stop() {
    if (m_proc) {
        m_proc->terminate();
        if (!m_proc->waitForFinished(1500)) {
            m_proc->kill();
        }
        m_proc->deleteLater();
        m_proc = nullptr;
    }
    m_inputLine.clear();
}

void TerminalWidget::onOutput() {
    if (!m_proc) return;
    const QByteArray out = m_proc->readAllStandardOutput() + m_proc->readAllStandardError();
    insertPlainText(QString::fromUtf8(out).replace("\r\n", "\n"));
    verticalScrollBar()->setValue(verticalScrollBar()->maximum());
}

void TerminalWidget::onProcessExit(int code, QProcess::ExitStatus) {
    appendHtml("<br><span style='color:#7c88a8'>[процесс завершён · код "
               + QString::number(code) + "]</span><br>");
    m_proc->deleteLater();
    m_proc = nullptr;
}

void TerminalWidget::appendPrompt() {
    const QString marker = m_shellName.contains("powershell") || m_shellName.contains("pwsh")
                               ? "PS "
                               : "$ ";
    insertPlainText(marker);
    m_inputLine.clear();
}

void TerminalWidget::sendInput(const QString& text) {
    if (m_proc) {
        m_proc->write((text + "\n").toUtf8());
    }
}

void TerminalWidget::keyPressEvent(QKeyEvent* event) {
    if (!m_proc) {
        QPlainTextEdit::keyPressEvent(event);
        return;
    }
    if (event->key() == Qt::Key_Return || event->key() == Qt::Key_Enter) {
        insertPlainText("\n");
        sendInput(m_inputLine);
        appendPrompt();
        return;
    }
    if (event->key() == Qt::Key_Backspace) {
        if (!m_inputLine.isEmpty()) {
            m_inputLine.chop(1);
            QPlainTextEdit::keyPressEvent(event);
        }
        return;
    }
    if (event->text().size() == 1 && !event->modifiers().testFlag(Qt::ControlModifier)) {
        m_inputLine += event->text();
        QPlainTextEdit::keyPressEvent(event);
        return;
    }
    QPlainTextEdit::keyPressEvent(event);
}
