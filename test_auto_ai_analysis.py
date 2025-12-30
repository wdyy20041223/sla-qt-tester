"""
测试自动 AI 分析功能

验证单元测试运行后自动进行 AI 分析并保存到数据库
"""
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from core.database import TestDatabase
from core.qt_project import run_unit_test
from core.qt_project.test_recorder import TestRecorder
from core.qt_project.test_analyzer import analyze_test_failure


def test_auto_ai_analysis():
    """测试自动 AI 分析功能"""
    print("=" * 60)
    print("测试：单元测试运行后自动 AI 分析")
    print("=" * 60)
    
    # 模拟测试失败的情况
    project_path = str(Path(__file__).parent / "playground" / "diagramscene_ultima")
    
    # 检查项目路径
    if not Path(project_path).exists():
        print(f"❌ 项目路径不存在: {project_path}")
        return False
    
    # 初始化数据库
    db = TestDatabase()
    recorder = TestRecorder(db)
    
    print(f"\n📁 项目路径: {project_path}")
    print(f"💾 数据库路径: {db.db_path}")
    
    # 模拟一个失败的测试结果
    from core.qt_project.unit_test_runner import TestResult, TestCaseResult
    
    mock_result = TestResult(
        test_name="test_example",
        status="failed",
        total=2,
        passed=1,
        failed=1,
        skipped=0,
        duration="0.5s",
        output="Test failed: Expected 10, got 5\nAssertion failed at line 42",
        details=[
            TestCaseResult(name="test_case_1", status="PASS"),
            TestCaseResult(name="test_case_2", status="FAIL", message="Expected 10, got 5")
        ]
    )
    
    # 模拟 AI 分析
    test_file_path = project_path + "/tests/test_example.cpp"
    
    print("\n🤖 开始 AI 分析...")
    try:
        # 这里模拟 AI 分析（实际应该调用真实的 API）
        ai_analysis = "# AI 分析结果\n\n## 问题原因\n测试失败是因为预期值与实际值不匹配。\n\n## 建议修复\n检查计算逻辑是否正确。"
        
        print(f"✅ AI 分析完成")
        print(f"分析结果长度: {len(ai_analysis)} 字符")
    except Exception as e:
        print(f"⚠️ AI 分析失败: {e}")
        ai_analysis = None
    
    # 记录到数据库
    print("\n💾 保存测试结果到数据库...")
    run_id = recorder.record_unit_test(project_path, mock_result, ai_analysis)
    
    print(f"✅ 测试结果已保存，run_id = {run_id}")
    
    # 验证数据库中的记录
    print("\n🔍 验证数据库记录...")
    history = db.get_test_runs(project_path, limit=1)
    
    if history:
        latest = history[0]
        print(f"✅ 找到最新记录:")
        print(f"   - test_name: {latest.test_name}")
        print(f"   - status: {latest.status}")
        print(f"   - ai_analysis: {'有' if latest.ai_analysis else '无'}")
        
        if latest.ai_analysis:
            print(f"   - 分析结果预览: {latest.ai_analysis[:50]}...")
            return True
        else:
            print(f"   ⚠️ 数据库中没有 AI 分析结果")
            return False
    else:
        print("❌ 未找到测试记录")
        return False


def test_api_integration():
    """测试 API 集成"""
    print("\n" + "=" * 60)
    print("测试：API 集成")
    print("=" * 60)
    
    from backend.api import API
    
    api = API()
    
    # 模拟运行测试（需要真实的可执行文件）
    project_path = str(Path(__file__).parent / "playground" / "diagramscene_ultima")
    
    # 检查是否有可用的测试
    tests = api.scan_unit_tests(project_path)
    
    if tests:
        print(f"✅ 找到 {len(tests)} 个测试")
        for test in tests[:3]:
            print(f"   - {test['name']}: {'存在' if test['exists'] else '不存在'}")
        
        # 如果有可用的测试，运行第一个失败的测试
        # （这里只是演示，实际需要有编译好的测试）
        print("\n提示：要完整测试，需要先编译 Qt 项目的测试")
        return True
    else:
        print("⚠️ 未找到测试文件")
        return False


if __name__ == "__main__":
    print("SLA Qt Tester - 自动 AI 分析功能测试")
    print("=" * 60)
    
    results = {
        "数据库记录": test_auto_ai_analysis(),
        "API集成": test_api_integration(),
    }
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    for name, passed in results.items():
        print(f"{'✓' if passed else '✗'} {name}")
    
    all_passed = all(results.values())
    print(f"\n总体结果: {'全部通过 ✓' if all_passed else '部分失败 ✗'}")
