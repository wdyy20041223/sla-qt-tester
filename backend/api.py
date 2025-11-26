"""
PyWebView JS Bridge API
暴露 Python 功能给前端 JavaScript
"""
from pathlib import Path
from typing import Dict, List
from core.calculator import add, subtract, multiply, divide, power
from core.user_service import UserService
from core.qt_project import scan_qt_projects, scan_directory_tree
from core.utils.logger import logger
import platform
import sys


class API:
    """
    PyWebView API 类
    所有方法会自动暴露给前端 JavaScript
    """

    def __init__(self):
        self.user_service = UserService()
        # 获取 playground 目录路径
        self.playground_dir = Path(__file__).parent.parent / "playground"
        logger.info("API 初始化完成")

    # ==================== 计算器 API ====================

    def add(self, a: float, b: float) -> float:
        """加法"""
        try:
            result = add(a, b)
            logger.info(f"计算: {a} + {b} = {result}")
            return result
        except Exception as e:
            logger.error(f"加法错误: {e}")
            raise

    def subtract(self, a: float, b: float) -> float:
        """减法"""
        try:
            return subtract(a, b)
        except Exception as e:
            logger.error(f"减法错误: {e}")
            raise

    def multiply(self, a: float, b: float) -> float:
        """乘法"""
        try:
            return multiply(a, b)
        except Exception as e:
            logger.error(f"乘法错误: {e}")
            raise

    def divide(self, a: float, b: float) -> float:
        """除法"""
        try:
            return divide(a, b)
        except Exception as e:
            logger.error(f"除法错误: {e}")
            return {"error": str(e)}

    def power(self, a: float, b: float) -> float:
        """幂运算"""
        try:
            return power(a, b)
        except Exception as e:
            logger.error(f"幂运算错误: {e}")
            raise

    # ==================== 用户管理 API ====================

    def create_user(self, name: str, email: str) -> Dict:
        """创建用户"""
        try:
            user = self.user_service.create_user(name, email)
            logger.info(f"创建用户: {user}")
            return user
        except Exception as e:
            logger.error(f"创建用户错误: {e}")
            return {"error": str(e)}

    def get_user(self, user_id: int) -> Dict:
        """获取用户"""
        try:
            user = self.user_service.get_user(user_id)
            if user:
                return user
            return {"error": "用户不存在"}
        except Exception as e:
            logger.error(f"获取用户错误: {e}")
            return {"error": str(e)}

    def list_users(self) -> List[Dict]:
        """列出所有用户"""
        try:
            return self.user_service.list_users()
        except Exception as e:
            logger.error(f"列出用户错误: {e}")
            return []

    def delete_user(self, user_id: int) -> Dict:
        """删除用户"""
        try:
            success = self.user_service.delete_user(user_id)
            return {"success": success}
        except Exception as e:
            logger.error(f"删除用户错误: {e}")
            return {"error": str(e)}

    # ==================== 系统 API ====================

    def get_version(self) -> str:
        """获取版本号"""
        return "1.0.0"

    def ping(self) -> str:
        """测试连接"""
        return "pong"

    def get_system_info(self):
        """获取系统信息"""
        logger.info("获取系统信息")
        return {
            "platform": platform.system(),
            "platform_version": platform.version(),
            "python_version": sys.version,
            "architecture": platform.machine(),
        }
    
    # ==================== Qt 项目管理 ====================
    
    def scan_qt_projects(self):
        """
        扫描 playground 目录下的 Qt 项目
        
        Returns:
            项目列表 [{"name": "...", "path": "...", ...}]
        """
        logger.info(f"扫描 Qt 项目: {self.playground_dir}")
        projects = scan_qt_projects(str(self.playground_dir))
        return [proj.to_dict() for proj in projects]
    
    def get_project_detail(self, project_path: str):
        """
        获取项目详细信息
        
        Args:
            project_path: 项目路径
            
        Returns:
            项目详细信息
        """
        logger.info(f"获取项目详情: {project_path}")
        project_dir = Path(project_path)
        
        if not project_dir.exists():
            return {"error": "项目不存在"}
        
        # 统计项目文件
        cpp_files = list(project_dir.glob("*.cpp")) + list(project_dir.glob("*.cc"))
        h_files = list(project_dir.glob("*.h")) + list(project_dir.glob("*.hpp"))
        ui_files = list(project_dir.glob("*.ui"))
        qrc_files = list(project_dir.glob("*.qrc"))
        
        return {
            "path": str(project_dir),
            "name": project_dir.name,
            "cpp_count": len(cpp_files),
            "header_count": len(h_files),
            "ui_count": len(ui_files),
            "qrc_count": len(qrc_files),
            "cpp_files": [f.name for f in cpp_files],
            "header_files": [f.name for f in h_files],
        }
    
    def get_project_file_tree(self, project_path: str):
        """
        获取项目文件树
        
        Args:
            project_path: 项目路径
            
        Returns:
            文件树结构
        """
        logger.info(f"获取项目文件树: {project_path}")
        nodes = scan_directory_tree(project_path, max_depth=5)
        return [node.to_dict() for node in nodes]
