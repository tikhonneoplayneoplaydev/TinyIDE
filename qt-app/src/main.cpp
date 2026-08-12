// TinyIDE Qt — точка входа
#include <QApplication>

#include "MainWindow.h"

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);
    app.setApplicationName("TinyIDE");
    app.setOrganizationName("TinyIDE");

    MainWindow w;
    w.resize(1380, 880);
    w.show();

    return app.exec();
}
