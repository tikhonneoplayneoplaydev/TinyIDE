#include "FunoHighlighter.h"

#include <QRegularExpression>

FunoHighlighter::FunoHighlighter(QTextDocument* parent) : QSyntaxHighlighter(parent) {
    auto fmtKeyword = QTextCharFormat();
    fmtKeyword.setForeground(QColor(0xff, 0x8a, 0xc2));
    fmtKeyword.setFontWeight(QFont::Bold);

    auto fmtType = QTextCharFormat();
    fmtType.setForeground(QColor(0x7a, 0xa2, 0xff));

    auto fmtFunc = QTextCharFormat();
    fmtFunc.setForeground(QColor(0x82, 0xaa, 0xff));

    auto fmtString = QTextCharFormat();
    fmtString.setForeground(QColor(0xa3, 0xe8, 0x8a));

    auto fmtNumber = QTextCharFormat();
    fmtNumber.setForeground(QColor(0xff, 0xb8, 0x6c));

    auto fmtComment = QTextCharFormat();
    fmtComment.setForeground(QColor(0x5b, 0x6a, 0x8c));
    fmtComment.setFontItalic(true);

    m_multiLineCommentFormat = fmtComment;

    // ключевые слова
    const QStringList keywords = {
        "fun", "let", "var", "const", "if", "else", "then", "while", "for",
        "in", "repeat", "break", "continue", "return", "and", "or", "not",
        "true", "false", "null",
    };
    for (const QString& kw : keywords) {
        Rule r;
        r.pattern = QRegularExpression("\\b" + kw + "\\b");
        r.format = fmtKeyword;
        m_rules.append(r);
    }

    // типы
    const QStringList types = {
        "byte", "short", "int", "long", "float", "double", "number", "text",
        "bool", "char", "any", "list", "set", "map",
    };
    for (const QString& t : types) {
        Rule r;
        r.pattern = QRegularExpression("\\b" + t + "\\b");
        r.format = fmtType;
        m_rules.append(r);
    }

    // встроенные функции
    const QStringList builtins = {
        "println", "print", "readln", "readInt", "readLong", "readDouble",
        "readBool", "len", "list", "set", "map", "toString", "toInt", "range",
    };
    for (const QString& b : builtins) {
        Rule r;
        r.pattern = QRegularExpression("\\b" + b + "(?=\\s*\\()");
        r.format = fmtFunc;
        m_rules.append(r);
    }

    // строки "…"
    {
        Rule r;
        r.pattern = QRegularExpression("\"[^\"\\\\]*(\\\\.[^\"\\\\]*)*\"");
        r.format = fmtString;
        m_rules.append(r);
    }
    // числа
    {
        Rule r;
        r.pattern = QRegularExpression("\\b\\d+(\\.\\d+)?\\b");
        r.format = fmtNumber;
        m_rules.append(r);
    }
    // однострочный комментарий //
    {
        Rule r;
        r.pattern = QRegularExpression("//[^\n]*");
        r.format = fmtComment;
        m_rules.append(r);
    }

    m_commentStart = QRegularExpression("/\\*");
    m_commentEnd = QRegularExpression("\\*/");
}

void FunoHighlighter::highlightBlock(const QString& text) {
    for (const Rule& rule : std::as_const(m_rules)) {
        auto it = rule.pattern.globalMatch(text);
        while (it.hasNext()) {
            auto match = it.next();
            setFormat(match.capturedStart(), match.capturedLength(), rule.format);
        }
    }

    // многострочный комментарий /* … */
    setCurrentBlockState(0);
    int startIndex = 0;
    if (previousBlockState() != 1) {
        auto m = m_commentStart.match(text);
        startIndex = m.capturedStart();
    }
    while (startIndex >= 0) {
        auto endMatch = m_commentEnd.match(text, startIndex);
        int endIndex = endMatch.capturedStart();
        int commentLength;
        if (endIndex == -1) {
            setCurrentBlockState(1);
            commentLength = text.length() - startIndex;
        } else {
            commentLength = endIndex - startIndex + endMatch.capturedLength();
        }
        setFormat(startIndex, commentLength, m_multiLineCommentFormat);
        startIndex = -1;
        if (previousBlockState() == 1) {
            break;
        }
    }
}
