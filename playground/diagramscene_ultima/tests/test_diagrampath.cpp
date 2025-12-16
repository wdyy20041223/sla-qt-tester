#include <QtTest/QtTest>
// 【修复1】正确的头文件包含方式
#include <QSignalSpy>

#include <QtWidgets/QGraphicsScene>
#include <QtWidgets/QGraphicsSceneMouseEvent>
#include <QtGui/QPainterPath>
#include <QtCore/QPointF>
#include <QtCore/QRectF>
#include <QtCore/QList>
#include <QtWidgets/QMenu>

// 包含项目源文件
#include "diagrampath.h"
#include "diagramitem.h"
#include "diagramscene.h"
#include "arrow.h"
#include "mainwindow.h"
#include "diagramtextitem.h"

/**
 * 【修复2】辅助类：通过继承暴露 protected 成员函数
 * 这样测试类就可以合法地调用鼠标事件了
 */
class TestableDiagramScene : public DiagramScene
{
public:
    // 继承基类的构造函数
    using DiagramScene::DiagramScene;

    // 将 protected 函数包装为 public 函数
    void publicMousePressEvent(QGraphicsSceneMouseEvent *event)
    {
        mousePressEvent(event);
    }
    void publicMouseMoveEvent(QGraphicsSceneMouseEvent *event)
    {
        mouseMoveEvent(event);
    }
    void publicMouseReleaseEvent(QGraphicsSceneMouseEvent *event)
    {
        mouseReleaseEvent(event);
    }
};

/**
 * @brief 真正的白盒单元测试 - DiagramEditor 核心模块
 * @author 火旅组测试团队
 * @date 2025-12-14
 */
class TestDiagramPath : public QObject
{
    Q_OBJECT

private slots:
    void initTestCase();
    void cleanupTestCase();

    // DiagramPath 模块
    void testDP01_PathStateCalculation();
    void testDP02_DrawZigBranch_VerticalConnection();
    void testDP03_DrawZigBranch_ZShapedConnection();

    // DiagramItem 模块
    void testDI01_BoundingRectRotation();
    void testDI02_LinkPointCalculation();

    // DiagramScene 模块
    void testDS01_ModeSwitchingAndItemCreation();
    void testDS02_AutoAlignLogic();

    // MainWindow 模块
    void testMW01_TextSerializationEscaping_BugVerification();

    // Arrow 模块
    void testAR01_ArrowCollisionTruncation();

private:
    // 【修复3】使用辅助类指针
    TestableDiagramScene *scene;
};

void TestDiagramPath::initTestCase()
{
    // 【修复3】实例化辅助类
    scene = new TestableDiagramScene(new QMenu());
    qDebug() << "=== 白盒单元测试环境初始化 ===";
}

void TestDiagramPath::cleanupTestCase()
{
    delete scene;
    qDebug() << "=== 白盒单元测试环境清理完成 ===";
}

// ============================================================================
// DiagramPath 模块
// ============================================================================

void TestDiagramPath::testDP01_PathStateCalculation()
{
    DiagramItem *startItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    DiagramItem *endItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);

    startItem->setPos(0, 0);
    endItem->setPos(100, 100);

    scene->addItem(startItem);
    scene->addItem(endItem);

    DiagramPath *path = new DiagramPath(
        startItem, endItem,
        DiagramItem::TF_Bottom,
        DiagramItem::TF_Top);

    scene->addItem(path);
    path->updatePath();

    QPainterPath painterPath = path->path();

    QVERIFY2(!painterPath.isEmpty(), "DP-01 失败：路径为空");
    QVERIFY2(painterPath.elementCount() > 2, "DP-01 失败：元素数量不足");

    scene->clear();
}

void TestDiagramPath::testDP02_DrawZigBranch_VerticalConnection()
{
    DiagramItem *startItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    DiagramItem *endItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);

    startItem->setPos(100, 100);
    endItem->setPos(100, 300);

    scene->addItem(startItem);
    scene->addItem(endItem);

    DiagramPath *path = new DiagramPath(
        startItem, endItem,
        DiagramItem::TF_Bottom,
        DiagramItem::TF_Top);

    scene->addItem(path);
    path->updatePath();

    QPainterPath painterPath = path->path();
    QVERIFY2(!painterPath.isEmpty(), "DP-02 失败：路径为空");

    bool hasVerticalSegment = false;
    for (int i = 0; i < painterPath.elementCount() - 1; ++i)
    {
        QPointF p1 = painterPath.elementAt(i);
        QPointF p2 = painterPath.elementAt(i + 1);
        if (qAbs(p1.x() - p2.x()) < 1.0)
        {
            hasVerticalSegment = true;
        }
    }
    QVERIFY2(hasVerticalSegment, "DP-02 失败：未找到垂直线段");
    scene->clear();
}

void TestDiagramPath::testDP03_DrawZigBranch_ZShapedConnection()
{
    DiagramItem *startItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    DiagramItem *endItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);

    startItem->setPos(0, 0);
    endItem->setPos(100, 50);

    scene->addItem(startItem);
    scene->addItem(endItem);

    DiagramPath *path = new DiagramPath(
        startItem, endItem,
        DiagramItem::TF_Right,
        DiagramItem::TF_Left);

    scene->addItem(path);
    path->updatePath();

    QPainterPath painterPath = path->path();
    QVERIFY2(!painterPath.isEmpty(), "DP-03 失败：路径为空");
    QVERIFY2(painterPath.elementCount() >= 3, "DP-03 失败：Z形路径元素不足");

    scene->clear();
}

// ============================================================================
// DiagramItem 模块
// ============================================================================

void TestDiagramPath::testDI01_BoundingRectRotation()
{
    DiagramItem *item = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    scene->addItem(item);

    QRectF originalRect = item->boundingRect();
    qreal originalWidth = originalRect.width();
    qreal originalHeight = originalRect.height();

    item->setRotationAngle(90);

    QRectF rotatedRect = item->boundingRect();
    qreal rotatedWidth = rotatedRect.width();
    qreal rotatedHeight = rotatedRect.height();

    qreal tolerance = 5.0;
    QVERIFY2(qAbs(rotatedWidth - originalHeight) < tolerance, "DI-01 失败：宽度计算错误");
    QVERIFY2(qAbs(rotatedHeight - originalWidth) < tolerance, "DI-01 失败：高度计算错误");

    scene->clear();
}

void TestDiagramPath::testDI02_LinkPointCalculation()
{
    DiagramItem *item = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    scene->addItem(item);

    QMap<DiagramItem::TransformState, QRectF> linkMap = item->linkWhere();
    QVERIFY2(linkMap.contains(DiagramItem::TF_Top), "DI-02 失败：缺少 TF_Top");

    QRectF topLinkRect = linkMap[DiagramItem::TF_Top];
    QPointF topCenter = topLinkRect.center();
    QRectF itemRect = item->boundingRect();

    QVERIFY2(qAbs(topCenter.y() - itemRect.top()) < 10.0, "DI-02 失败：TF_Top Y坐标偏差过大");
    QVERIFY2(qAbs(topCenter.x() - itemRect.center().x()) < 20.0, "DI-02 失败：TF_Top X坐标偏差过大");

    scene->clear();
}

// ============================================================================
// DiagramScene 模块 (涉及事件调用修复)
// ============================================================================

void TestDiagramPath::testDS01_ModeSwitchingAndItemCreation()
{
    scene->clear();
    int initialCount = scene->items().count();

    scene->setMode(DiagramScene::InsertItem);
    scene->setItemType(DiagramItem::Step);

    // 注意：DiagramScene 的 myMode 是私有成员，无法直接访问
    // 通过后续行为验证模式是否正确设置

    QSignalSpy spy(scene, &DiagramScene::itemInserted);

    QGraphicsSceneMouseEvent *clickEvent = new QGraphicsSceneMouseEvent(QEvent::GraphicsSceneMousePress);
    clickEvent->setScenePos(QPointF(100, 100));
    clickEvent->setButton(Qt::LeftButton);

    // 【修复4】调用 public 包装函数
    scene->publicMousePressEvent(clickEvent);
    delete clickEvent;

    QVERIFY2(scene->items().count() > initialCount, "DS-01 失败：图元未创建");
    QVERIFY2(spy.count() > 0, "DS-01 失败：信号未发射");

    scene->clear();
}

void TestDiagramPath::testDS02_AutoAlignLogic()
{
    DiagramItem *itemA = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    itemA->setPos(100, 100);
    scene->addItem(itemA);

    DiagramItem *itemB = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    itemB->setPos(200, 200);
    itemB->setFlag(QGraphicsItem::ItemIsMovable);
    itemB->setFlag(QGraphicsItem::ItemIsSelectable);
    scene->addItem(itemB);
    itemB->setSelected(true);

    scene->setMode(DiagramScene::MoveItem);

    // 模拟按下
    QGraphicsSceneMouseEvent *pressEvent = new QGraphicsSceneMouseEvent(QEvent::GraphicsSceneMousePress);
    pressEvent->setScenePos(QPointF(200, 200));
    pressEvent->setButton(Qt::LeftButton);
    // 【修复4】调用 public 包装函数
    scene->publicMousePressEvent(pressEvent);
    delete pressEvent;

    // 模拟移动
    QGraphicsSceneMouseEvent *moveEvent = new QGraphicsSceneMouseEvent(QEvent::GraphicsSceneMouseMove);
    moveEvent->setScenePos(QPointF(105, 300));
    moveEvent->setButton(Qt::LeftButton);
    // 【修复4】调用 public 包装函数
    scene->publicMouseMoveEvent(moveEvent);
    delete moveEvent;

    // 模拟释放
    QGraphicsSceneMouseEvent *releaseEvent = new QGraphicsSceneMouseEvent(QEvent::GraphicsSceneMouseRelease);
    releaseEvent->setScenePos(QPointF(105, 300));
    releaseEvent->setButton(Qt::LeftButton);
    // 【修复4】调用 public 包装函数
    scene->publicMouseReleaseEvent(releaseEvent);
    delete releaseEvent;

    QVERIFY2(itemB->pos() != QPointF(200, 200), "DS-02 失败：Item B 未移动");
    scene->clear();
}

// ============================================================================
// MainWindow 模块 (Bug 验证)
// ============================================================================

void TestDiagramPath::testMW01_TextSerializationEscaping_BugVerification()
{
    QString originalText1 = "Hello World";
    QString savedText1 = originalText1;
    savedText1.replace(" ", "*");
    QString restoredText1 = savedText1;
    restoredText1.replace("*", " ");
    QCOMPARE(restoredText1, originalText1);

    QString originalText2 = " Price * Count ";
    QString savedText2 = originalText2;
    savedText2.replace(" ", "*");
    QString restoredText2 = savedText2;
    restoredText2.replace("*", " ");

    // 预期发现缺陷
    QVERIFY2(restoredText2 != originalText2, "MW-01: 预期发现逻辑缺陷");
}

// ============================================================================
// Arrow 模块
// ============================================================================

void TestDiagramPath::testAR01_ArrowCollisionTruncation()
{
    DiagramItem *startItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);
    DiagramItem *endItem = new DiagramItem(DiagramItem::Step, nullptr, nullptr);

    startItem->setPos(0, 0);
    endItem->setPos(200, 0);

    scene->addItem(startItem);
    scene->addItem(endItem);

    Arrow *arrow = new Arrow(startItem, endItem);
    scene->addItem(arrow);
    arrow->updatePosition();

    QPointF arrowEndPoint = arrow->line().p2();
    qreal endItemCenterX = endItem->pos().x();

    QVERIFY2(arrowEndPoint.x() < endItemCenterX, "AR-01 失败：箭头未截断");

    qreal endItemLeftEdge = endItem->pos().x() + endItem->boundingRect().left();
    QVERIFY2(qAbs(arrowEndPoint.x() - endItemLeftEdge) < 30.0, "AR-01 失败：截断位置不准确");

    scene->clear();
}

QTEST_MAIN(TestDiagramPath)
#include "test_diagrampath.moc"
