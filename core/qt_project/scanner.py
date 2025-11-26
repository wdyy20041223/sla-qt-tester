"""
Qt 项目扫描器
扫描 playground 目录，识别 Qt 项目
"""
import os
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, asdict
from core.utils.logger import logger


@dataclass
class QtProjectInfo:
    """Qt 项目信息"""
    name: str                    # 项目名称
    path: str                    # 项目路径
    project_file: str            # .pro 或 CMakeLists.txt 文件
    project_type: str            # 'qmake' 或 'cmake'
    description: Optional[str] = None
    
    def to_dict(self):
        """转换为字典（用于 JSON 序列化）"""
        return asdict(self)


def scan_qt_projects(playground_dir: str) -> List[QtProjectInfo]:
    """
    扫描 playground 目录，识别 Qt 项目
    
    识别规则：
    - 包含 .pro 文件 -> qmake 项目
    - 包含 CMakeLists.txt 且内容包含 Qt 关键字 -> cmake 项目
    
    Args:
        playground_dir: playground 目录路径
        
    Returns:
        Qt 项目信息列表
    """
    playground_path = Path(playground_dir)
    
    if not playground_path.exists():
        logger.warning(f"Playground 目录不存在: {playground_dir}")
        return []
    
    projects = []
    
    # 遍历 playground 下的所有子目录
    for item in playground_path.iterdir():
        if not item.is_dir():
            continue
        
        # 跳过隐藏目录和特殊目录
        if item.name.startswith('.') or item.name in ['__pycache__', 'node_modules']:
            continue
        
        project_info = _identify_qt_project(item)
        if project_info:
            projects.append(project_info)
            logger.info(f"发现 Qt 项目: {project_info.name} ({project_info.project_type})")
    
    return projects


def _identify_qt_project(project_dir: Path) -> Optional[QtProjectInfo]:
    """
    识别目录是否为 Qt 项目
    
    Args:
        project_dir: 项目目录
        
    Returns:
        Qt 项目信息，如果不是 Qt 项目则返回 None
    """
    # 检查 .pro 文件（qmake）
    pro_files = list(project_dir.glob("*.pro"))
    if pro_files:
        pro_file = pro_files[0]
        description = _extract_pro_description(pro_file)
        return QtProjectInfo(
            name=project_dir.name,
            path=str(project_dir),
            project_file=str(pro_file),
            project_type='qmake',
            description=description
        )
    
    # 检查 CMakeLists.txt（cmake）
    cmake_file = project_dir / "CMakeLists.txt"
    if cmake_file.exists():
        if _is_qt_cmake_project(cmake_file):
            description = _extract_cmake_description(cmake_file)
            return QtProjectInfo(
                name=project_dir.name,
                path=str(project_dir),
                project_file=str(cmake_file),
                project_type='cmake',
                description=description
            )
    
    return None


def _is_qt_cmake_project(cmake_file: Path) -> bool:
    """判断 CMakeLists.txt 是否为 Qt 项目"""
    try:
        content = cmake_file.read_text(encoding='utf-8', errors='ignore')
        # 检查是否包含 Qt 相关关键字
        qt_keywords = ['find_package(Qt', 'Qt5::', 'Qt6::', 'QT_VERSION']
        return any(keyword in content for keyword in qt_keywords)
    except Exception as e:
        logger.error(f"读取 CMakeLists.txt 失败: {e}")
        return False


def _extract_pro_description(pro_file: Path) -> Optional[str]:
    """从 .pro 文件提取项目描述"""
    try:
        content = pro_file.read_text(encoding='utf-8', errors='ignore')
        # 查找注释中的描述
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('#') and len(line) > 2:
                desc = line[1:].strip()
                if desc and not desc.startswith('!'):
                    return desc
        return None
    except Exception:
        return None


def _extract_cmake_description(cmake_file: Path) -> Optional[str]:
    """从 CMakeLists.txt 提取项目描述"""
    try:
        content = cmake_file.read_text(encoding='utf-8', errors='ignore')
        # 查找 project() 命令中的 DESCRIPTION
        import re
        match = re.search(r'project\([^)]*DESCRIPTION\s+"([^"]+)"', content, re.IGNORECASE)
        if match:
            return match.group(1)
        return None
    except Exception:
        return None
