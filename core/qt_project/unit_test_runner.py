"""
单元测试运行器
运行 Qt 单元测试并解析结果
"""
import subprocess
import re
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class TestCaseResult:
    """单个测试用例结果"""
    name: str              # 测试用例名称
    status: str            # 'PASS' | 'FAIL' | 'SKIP'
    message: Optional[str] = None  # 失败信息
    
    def to_dict(self):
        return asdict(self)


@dataclass
class TestResult:
    """测试结果"""
    test_name: str         # 测试名称
    status: str            # 'passed' | 'failed' | 'error'
    total: int             # 总数
    passed: int            # 通过数
    failed: int            # 失败数
    skipped: int           # 跳过数
    duration: str          # 耗时
    output: str            # 完整输出
    details: List[TestCaseResult]  # 详细结果
    
    def to_dict(self):
        return {
            'test_name': self.test_name,
            'status': self.status,
            'total': self.total,
            'passed': self.passed,
            'failed': self.failed,
            'skipped': self.skipped,
            'duration': self.duration,
            'output': self.output,
            'details': [d.to_dict() for d in self.details]
        }


def run_unit_test(executable_path: str, test_name: str) -> TestResult:
    """
    运行单元测试
    
    Args:
        executable_path: 测试可执行文件路径
        test_name: 测试名称
        
    Returns:
        测试结果
    """
    try:
        import os
        import platform
        from pathlib import Path
        
        # 设置环境变量，添加 Qt bin 目录到 PATH
        env = os.environ.copy()
        
        # 从可执行文件路径推断 Qt 安装位置
        exe_path = Path(executable_path)
        
        # 尝试查找 Qt bin 目录
        # 在 Windows 上，Qt DLL 通常在项目附近或 Qt 安装目录
        possible_qt_paths = []
        
        if platform.system() == "Windows":
            # 查找常见的 Qt 路径
            for drive in ['C:', 'D:']:
                possible_qt_paths.extend([
                    f"{drive}\\Qt\\6.10.1\\mingw_64\\bin",
                    f"{drive}\\qtcreator\\6.10.1\\mingw_64\\bin",
                ])
            
            # 添加到 PATH
            for qt_path in possible_qt_paths:
                if Path(qt_path).exists():
                    env['PATH'] = f"{qt_path};{env['PATH']}"
                    break
        
        # 运行测试
        result = subprocess.run(
            [executable_path],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',  # 遇到无法解码的字节用 � 替换
            timeout=30,
            env=env
        )
        
        output = result.stdout + result.stderr
        
        # 解析输出
        return parse_qtest_output(test_name, output, result.returncode)
        
    except subprocess.TimeoutExpired:
        return TestResult(
            test_name=test_name,
            status='error',
            total=0,
            passed=0,
            failed=0,
            skipped=0,
            duration='timeout',
            output='测试超时（30秒）',
            details=[]
        )
    except Exception as e:
        return TestResult(
            test_name=test_name,
            status='error',
            total=0,
            passed=0,
            failed=0,
            skipped=0,
            duration='0ms',
            output=f'运行失败: {str(e)}',
            details=[]
        )


def parse_qtest_output(test_name: str, output: str, return_code: int) -> TestResult:
    """
    解析 QTest 输出
    
    Args:
        test_name: 测试名称
        output: 测试输出
        return_code: 返回码
        
    Returns:
        测试结果
    """
    details = []
    
    # 解析每个测试用例
    # 格式: PASS   : TestClass::testMethod()
    # 格式: FAIL!  : TestClass::testMethod() ...
    pass_pattern = r'PASS\s+:\s+\w+::(\w+)\(\)'
    fail_pattern = r'FAIL!\s+:\s+\w+::(\w+)\(\)'
    
    for match in re.finditer(pass_pattern, output):
        details.append(TestCaseResult(
            name=match.group(1),
            status='PASS'
        ))
    
    for match in re.finditer(fail_pattern, output):
        # 尝试提取失败信息
        case_name = match.group(1)
        # 查找下一行的错误信息
        lines = output[match.end():].split('\n')
        message = lines[0].strip() if lines else None
        
        details.append(TestCaseResult(
            name=case_name,
            status='FAIL',
            message=message
        ))
    
    # 解析总结行
    # 格式: Totals: 4 passed, 0 failed, 0 skipped, 0 blacklisted, 1ms
    totals_pattern = r'Totals:\s+(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+skipped,\s+\d+\s+blacklisted,\s+(\d+\w+)'
    totals_match = re.search(totals_pattern, output)
    
    if totals_match:
        passed = int(totals_match.group(1))
        failed = int(totals_match.group(2))
        skipped = int(totals_match.group(3))
        duration = totals_match.group(4)
        total = passed + failed + skipped
        
        status = 'passed' if failed == 0 and return_code == 0 else 'failed'
    else:
        # 无法解析，使用返回码判断
        passed = len([d for d in details if d.status == 'PASS'])
        failed = len([d for d in details if d.status == 'FAIL'])
        skipped = 0
        total = passed + failed
        duration = '0ms'
        status = 'passed' if return_code == 0 else 'failed'
    
    return TestResult(
        test_name=test_name,
        status=status,
        total=total,
        passed=passed,
        failed=failed,
        skipped=skipped,
        duration=duration,
        output=output,
        details=details
    )
