"""
单元测试扫描器
扫描 Qt 项目的单元测试文件
"""
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, asdict
import platform
import re


@dataclass
class UnitTestFile:
    """单元测试文件信息"""
    name: str                    # 测试名称 (test_diagramitem)
    file_path: str               # 源文件路径
    executable_path: str         # 可执行文件路径
    exists: bool                 # 可执行文件是否存在
    
    def to_dict(self):
        """转换为字典"""
        return asdict(self)


def scan_unit_tests(project_path: str) -> List[UnitTestFile]:
    """
    扫描项目的单元测试
    
    Args:
        project_path: 项目路径
        
    Returns:
        单元测试文件列表
    """
    project_dir = Path(project_path)
    tests_dir = project_dir / "tests"
    build_dir = project_dir / "build" / "tests"
    
    if not tests_dir.exists():
        return []
    
    test_files = []
    
    # 扫描 tests 目录下的 test_*.cpp 文件
    for test_file in tests_dir.glob("test_*.cpp"):
        test_name = test_file.stem  # 去掉 .cpp 后缀
        
        # 查找对应的可执行文件（跨平台）
        executable_path = _find_test_executable(build_dir, test_name)
        
        test_info = UnitTestFile(
            name=test_name,
            file_path=str(test_file),
            executable_path=str(executable_path),
            exists=executable_path.exists()
        )
        test_files.append(test_info)
    
    return test_files


def _find_test_executable(build_dir: Path, test_name: str) -> Path:
    """
    跨平台查找测试可执行文件
    
    Args:
        build_dir: build/tests 目录（或 build 根目录）
        test_name: 测试名称
        
    Returns:
        可执行文件路径（可能不存在）
    """
    system = platform.system()
    
    if system == "Windows":
        # Windows: 搜索可能的位置
        # 1. build/tests/test_name.exe (CMake 命令行)
        # 2. build/tests/Release/test_name.exe (Visual Studio)
        # 3. build/tests/Debug/test_name.exe (Visual Studio Debug)
        # 4. build/Desktop_Qt_*/test_name.exe (Qt Creator)
        
        # 尝试多个可能的路径
        possible_paths = [
            build_dir / f"{test_name}.exe",  # tests/ 目录直接编译
            build_dir / "Release" / f"{test_name}.exe",  # VS Release
            build_dir / "Debug" / f"{test_name}.exe",  # VS Debug
        ]
        
        # 检查是否存在，返回第一个找到的
        for path in possible_paths:
            if path.exists():
                return path
        
        # 搜索 Qt Creator 的构建目录（Desktop_Qt_*）
        build_root = build_dir.parent  # 从 build/tests 回到 build
        for qt_build_dir in build_root.glob("Desktop_Qt_*"):
            qt_exe = qt_build_dir / f"{test_name}.exe"
            if qt_exe.exists():
                return qt_exe
        
        # 默认返回第一个路径（即使不存在）
        executable_path = possible_paths[0]
        
    elif system == "Darwin":  # macOS
        # 优先尝试 .app 包（Qt 默认）
        app_path = build_dir / f"{test_name}.app" / "Contents" / "MacOS" / test_name
        if app_path.exists():
            return app_path
        
        # 回退到普通可执行文件
        executable_path = build_dir / test_name
        
    else:  # Linux 和其他 Unix-like 系统
        # Linux: test_name (无扩展名)
        executable_path = build_dir / test_name
    
    return executable_path


def parse_test_cases_from_source(source_file: str) -> List[str]:
    """
    从源文件解析测试用例名称
    
    Args:
        source_file: 测试源文件路径
        
    Returns:
        测试用例名称列表
    """
    try:
        content = Path(source_file).read_text(encoding='utf-8', errors='ignore')
        
        # 匹配 private slots: 下的 void testXxx() 方法
        pattern = r'void\s+(test\w+)\s*\('
        matches = re.findall(pattern, content)
        
        return matches
    except Exception:
        return []
