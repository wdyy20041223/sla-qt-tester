# 测试 CMakeLists.txt
cmake_minimum_required(VERSION 3.16)

find_package(Qt6 REQUIRED COMPONENTS Test Widgets Svg)

enable_testing()

# 测试 1: DiagramItem 测试
qt_add_executable(test_diagramitem
    test_diagramitem.cpp
    test_globals.cpp
    ../diagramitem.cpp
    ../arrow.cpp
    ../diagrampath.cpp
    ../diagramtextitem.cpp
)

target_link_libraries(test_diagramitem PRIVATE
    Qt6::Test
    Qt6::Widgets
    Qt6::Svg
)

target_include_directories(test_diagramitem PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/..
)

add_test(NAME test_diagramitem COMMAND test_diagramitem)

# 测试 2: QGraphicsScene 基础测试（简化版）
qt_add_executable(test_diagramscene
    test_diagramscene.cpp
)

target_link_libraries(test_diagramscene PRIVATE
    Qt6::Test
    Qt6::Widgets
)

add_test(NAME test_diagramscene COMMAND test_diagramscene)

# 测试 3: UI 交互测试（DiagramScene 功能测试）
qt_add_executable(test_ui_interaction
    test_ui_interaction.cpp
    ../diagramscene.cpp
    ../diagramitem.cpp
    ../diagramitemgroup.cpp
    ../diagrampath.cpp
    ../diagramtextitem.cpp
    ../arrow.cpp
    ../mainwindow.cpp
    ../findreplacedialog.cpp
    ../mygraphicsview.cpp
    ../deletecommand.cpp
    ../snapshotcommand.cpp
)

target_link_libraries(test_ui_interaction PRIVATE
    Qt6::Test
    Qt6::Widgets
    Qt6::Svg
)

target_include_directories(test_ui_interaction PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/..
)

add_test(NAME test_ui_interaction COMMAND test_ui_interaction)
