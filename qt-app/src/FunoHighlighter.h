#pragma once

#include <QRegularExpression>
#include <QSyntaxHighlighter>

// Подсветка синтаксиса Funo (порт Monarch-токенизатора на C++).
class FunoHighlighter : public QSyntaxHighlighter {
    Q_OBJECT

public:
    explicit FunoHighlighter(QTextDocument* parent);

protected:
    void highlightBlock(const QString& text) override;

private:
    struct Rule {
        QRegularExpression pattern;
        QTextCharFormat format;
    };
    QVector<Rule> m_rules;
    QRegularExpression m_commentStart;
    QRegularExpression m_commentEnd;
    QTextCharFormat m_multiLineCommentFormat;
};
