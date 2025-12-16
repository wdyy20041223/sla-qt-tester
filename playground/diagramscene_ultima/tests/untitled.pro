QT += testlib widgets gui core testlib svg

CONFIG += qt console warn_on depend_includepath testcase
CONFIG -= app_bundle

TEMPLATE = app

# 设置源码路径（相对路径）
SRC_PATH = ../diagramscene_ultima

# 包含路径
INCLUDEPATH += $$SRC_PATH

# 测试源文件
SOURCES += \
    test_diagrampath.cpp

# 主项目源文件（测试需要链接）
SOURCES += \
    $$SRC_PATH/diagrampath.cpp \
    $$SRC_PATH/diagramitem.cpp \
    $$SRC_PATH/diagramscene.cpp \
    $$SRC_PATH/arrow.cpp \
    $$SRC_PATH/diagramtextitem.cpp \
    $$SRC_PATH/deletecommand.cpp \
    $$SRC_PATH/diagramitemgroup.cpp

HEADERS += \
    $$SRC_PATH/diagrampath.h \
    $$SRC_PATH/diagramitem.h \
    $$SRC_PATH/diagramscene.h \
    $$SRC_PATH/arrow.h \
    $$SRC_PATH/diagramtextitem.h \
    $$SRC_PATH/deletecommand.h \
    $$SRC_PATH/diagramitemgroup.h
