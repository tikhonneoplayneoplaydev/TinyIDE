#pragma once

#include <QProcess>
#include <QPlainTextEdit>
#include <QStringList>

// Терминал: QProcess + QPlainTextEdit. Запускает выбранную оболочку
// (cmd / powershell / bash / nu / pwsh — по наличию), стримит вывод.
class TerminalWidget : public QPlainTextEdit {
    Q_OBJECT

public:
    explicit TerminalWidget(QWidget* parent = nullptr);

    void startShell(const QString& shell);
    void stop();

    static QStringList availableShells();

private slots:
    void onOutput();
    void onProcessExit(int code, QProcess::ExitStatus status);

protected:
    void keyPressEvent(QKeyEvent* event) override;

private:
    void appendPrompt();
    void sendInput(const QString& text);

    QProcess* m_proc = nullptr;
    QString m_inputLine;
    QString m_shellName;
};
