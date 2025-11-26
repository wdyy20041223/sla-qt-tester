#include <QtTest/QtTest>
#include <QApplication>
#include <QGraphicsView>
#include <QGraphicsScene>
#include <QGraphicsSceneMouseEvent>
#include <QSignalSpy>
#include <QMenu>
#include <QDir>
#include <QPixmap>
#include "../diagramscene.h"
#include "../diagramitem.h"
#include "../mainwindow.h"

/**
 * DiagramScene UI 交互测试
 * 简化版：只测试基本的插入和移动操作，每步截图
 */
class TestUIInteraction : public QObject
{
    Q_OBJECT

private slots:
    void initTestCase();
    void cleanupTestCase();
    void init();
    void cleanup();

    // 简化的测试流程
    void testBasicOperations();

private:
    MainWindow *mainWindow;
    DiagramScene *scene;
    QGraphicsView *view;
    QString screenshotDir;
    int stepCounter;
    
    // 截图辅助函数
    void takeScreenshot(const QString &stepName);
};

void TestUIInteraction::initTestCase()
{
    qDebug() << "=== 开始 DiagramScene UI 交互测试 ===";
}

void TestUIInteraction::cleanupTestCase()
{
    qDebug() << "=== 完成 DiagramScene UI 交互测试 ===";
}

void TestUIInteraction::init()
{
    // 初始化步骤计数器
    stepCounter = 0;
    
    // 创建截图目录（隐藏目录）
    QString projectDir = QDir::currentPath();
    screenshotDir = projectDir + "/.test_screenshots";
    QDir dir;
    if (!dir.exists(screenshotDir)) {
        dir.mkpath(screenshotDir);
    }
    
    // 清空旧截图
    QDir screenshotFolder(screenshotDir);
    screenshotFolder.setNameFilters(QStringList() << "*.png");
    screenshotFolder.setFilter(QDir::Files);
    foreach(QString file, screenshotFolder.entryList()) {
        screenshotFolder.remove(file);
    }
    
    qDebug() << "截图目录:" << screenshotDir;
    
    // 创建主窗口
    mainWindow = new MainWindow();
    mainWindow->setWindowTitle("DiagramScene UI Test");
    mainWindow->resize(800, 600);
    
    // 获取场景和视图
    QMenu *itemMenu = new QMenu();
    scene = new DiagramScene(itemMenu, this);
    scene->setSceneRect(QRectF(0, 0, 5000, 5000));
    
    view = new QGraphicsView(scene);
    view->setParent(mainWindow);
    view->setRenderHint(QPainter::Antialiasing);
    view->setViewportUpdateMode(QGraphicsView::FullViewportUpdate);
    view->setGeometry(0, 0, 800, 600);
    
    // 显示窗口
    mainWindow->show();
    QVERIFY(QTest::qWaitForWindowExposed(mainWindow));
    
    // 等待窗口稳定
    QTest::qWait(500);
}

void TestUIInteraction::cleanup()
{
    delete mainWindow;
    mainWindow = nullptr;
    scene = nullptr;
    view = nullptr;
}

void TestUIInteraction::takeScreenshot(const QString &stepName)
{
    stepCounter++;
    QString filename = QString("%1/step_%2_%3.png")
        .arg(screenshotDir)
        .arg(stepCounter, 2, 10, QChar('0'))
        .arg(stepName);
    
    // 确保界面更新
    QApplication::processEvents();
    QTest::qWait(300);
    
    // 截取主窗口
    QPixmap screenshot = mainWindow->grab();
    bool saved = screenshot.save(filename);
    
    if (saved) {
        qDebug() << QString("✓ 截图保存: step_%1_%2.png").arg(stepCounter, 2, 10, QChar('0')).arg(stepName);
    } else {
        qWarning() << "✗ 截图保存失败:" << filename;
    }
}

void TestUIInteraction::testBasicOperations()
{
    qDebug() << "\n=== 开始基本操作测试（共4步） ===\n";
    
    // 步骤 1: 初始状态
    qDebug() << "步骤 1: 初始空白场景";
    QVERIFY(scene != nullptr);
    QVERIFY(view != nullptr);
    QCOMPARE(scene->items().count(), 0);
    takeScreenshot("initial_empty");
    
    // 步骤 2: 插入第一个图元
    qDebug() << "\n步骤 2: 插入第一个图元（Step类型）";
    scene->setMode(DiagramScene::InsertItem);
    scene->setItemType(DiagramItem::Step);
    QTest::qWait(300);
    
    QPointF pos1(200, 200);
    QGraphicsSceneMouseEvent event1(QEvent::GraphicsSceneMousePress);
    event1.setScenePos(pos1);
    event1.setButton(Qt::LeftButton);
    QApplication::sendEvent(scene, &event1);
    QTest::qWait(500);
    
    QCOMPARE(scene->items().count(), 1);
    takeScreenshot("insert_first_item");
    
    // 步骤 3: 插入第二个图元
    qDebug() << "\n步骤 3: 插入第二个图元（Conditional类型）";
    scene->setItemType(DiagramItem::Conditional);
    QTest::qWait(300);
    
    QPointF pos2(400, 200);
    QGraphicsSceneMouseEvent event2(QEvent::GraphicsSceneMousePress);
    event2.setScenePos(pos2);
    event2.setButton(Qt::LeftButton);
    QApplication::sendEvent(scene, &event2);
    QTest::qWait(500);
    
    QCOMPARE(scene->items().count(), 2);
    takeScreenshot("insert_second_item");
    
    // 步骤 4: 切换到移动模式
    qDebug() << "\n步骤 4: 切换到移动模式";
    scene->setMode(DiagramScene::MoveItem);
    QTest::qWait(500);
    takeScreenshot("switch_to_move_mode");
    
    qDebug() << "\n=== 测试完成！所有截图已保存到" << screenshotDir << "===\n";
}

// 使用 QTEST_MAIN 宏自动生成 main 函数
QTEST_MAIN(TestUIInteraction)
#include "test_ui_interaction.moc"
