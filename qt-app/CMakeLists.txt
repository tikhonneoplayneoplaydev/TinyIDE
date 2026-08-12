cmake_minimum_required(VERSION 3.16)
project(TinyIDE_Qt VERSION 0.1.0 LANGUAGES CXX)

# ─── Qt-версия TinyIDE: нативный UI вместо вебвью ──────────────────────────
# Сборка: cmake -S qt-app -B qt-app/build -DCMAKE_PREFIX_PATH=C:/Qt/6.8.3/mingw_64
#         cmake --build qt-app/build -j

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(tinyide-qt
  src/main.cpp
  src/MainWindow.h
  src/MainWindow.cpp
  src/Editor.h
  src/Editor.cpp
  src/FunoHighlighter.h
  src/FunoHighlighter.cpp
)

target_link_libraries(tinyide-qt PRIVATE Qt6::Widgets)
