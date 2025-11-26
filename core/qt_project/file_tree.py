"""
文件树扫描器
"""
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict


@dataclass
class FileNode:
    """文件/目录节点"""
    name: str
    path: str
    type: str  # 'file' 或 'directory'
    extension: Optional[str] = None
    children: Optional[List['FileNode']] = None
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        result = {
            'name': self.name,
            'path': self.path,
            'type': self.type,
        }
        if self.extension:
            result['extension'] = self.extension
        if self.children:
            result['children'] = [child.to_dict() for child in self.children]
        return result


def scan_directory_tree(directory: str, max_depth: int = 5) -> List[FileNode]:
    """
    扫描目录树
    
    Args:
        directory: 目录路径
        max_depth: 最大深度
        
    Returns:
        文件节点列表
    """
    dir_path = Path(directory)
    if not dir_path.exists() or not dir_path.is_dir():
        return []
    
    return _scan_recursive(dir_path, current_depth=0, max_depth=max_depth)


def _scan_recursive(path: Path, current_depth: int, max_depth: int) -> List[FileNode]:
    """递归扫描目录"""
    if current_depth >= max_depth:
        return []
    
    nodes = []
    
    try:
        # 获取所有项目并排序（目录在前，文件在后）
        items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
        
        for item in items:
            # 跳过隐藏文件和特殊目录
            if item.name.startswith('.') or item.name in ['__pycache__', 'node_modules', 'build', 'dist']:
                continue
            
            if item.is_dir():
                # 目录节点
                children = _scan_recursive(item, current_depth + 1, max_depth)
                node = FileNode(
                    name=item.name,
                    path=str(item),
                    type='directory',
                    children=children if children else None
                )
                nodes.append(node)
            else:
                # 文件节点
                extension = item.suffix[1:] if item.suffix else None
                node = FileNode(
                    name=item.name,
                    path=str(item),
                    type='file',
                    extension=extension
                )
                nodes.append(node)
    except PermissionError:
        pass
    
    return nodes
