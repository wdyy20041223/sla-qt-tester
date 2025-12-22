"""
静态分析 API
提供 cppcheck 相关的后端接口
"""
from pathlib import Path
from typing import Dict, Optional

from core.qt_project.cppcheck_manager import CppcheckManager
from core.qt_project.static_analyzer import StaticAnalyzer
from core.utils.logger import logger


class StaticAnalysisAPI:
    """静态分析 API 类"""
    
    def __init__(self):
        self.cppcheck_manager = CppcheckManager()
    
    def check_cppcheck_status(self) -> Dict[str, any]:
        """
        检查 cppcheck 状态
        
        Returns:
            状态信息字典
        """
        try:
            cppcheck_path = self.cppcheck_manager.get_cppcheck_path()
            
            if cppcheck_path:
                version = self.cppcheck_manager.get_version(cppcheck_path)
                return {
                    "installed": True,
                    "path": cppcheck_path,
                    "version": version,
                    "message": f"Cppcheck 已安装: {version}"
                }
            else:
                return {
                    "installed": False,
                    "path": None,
                    "version": None,
                    "message": "未找到 cppcheck"
                }
        except Exception as e:
            logger.error(f"检查 cppcheck 状态失败: {e}")
            return {
                "installed": False,
                "path": None,
                "version": None,
                "message": f"检查失败: {str(e)}"
            }
    
    def install_cppcheck(self) -> Dict[str, any]:
        """
        安装 cppcheck
        
        Returns:
            安装结果字典
        """
        try:
            logger.info("开始安装 cppcheck...")
            result = self.cppcheck_manager.install()
            logger.info(f"安装结果: {result}")
            return result
        except Exception as e:
            logger.error(f"安装 cppcheck 失败: {e}")
            return {
                "success": False,
                "path": None,
                "message": f"安装失败: {str(e)}"
            }
    
    def analyze_project(
        self,
        project_dir: str,
        include_paths: Optional[list] = None,
        enable_checks: Optional[list] = None,
        severity: str = "warning",
        cppcheck_options: Optional[dict] = None
    ) -> Dict[str, any]:
        """
        分析整个项目
        
        Args:
            project_dir: 项目目录
            include_paths: 额外的头文件搜索路径
            enable_checks: 启用的检查类型
            severity: 严重程度过滤
            cppcheck_options: cppcheck 选项配置
        
        Returns:
            分析结果字典
        """
        try:
            # 检查项目目录是否存在
            project_path = Path(project_dir)
            if not project_path.exists():
                return {
                    "success": False,
                    "message": f"项目目录不存在: {project_dir}",
                    "errors": [],
                    "warnings": [],
                    "statistics": {}
                }
            
            # 检查 cppcheck 是否可用
            if not self.cppcheck_manager.get_cppcheck_path():
                return {
                    "success": False,
                    "message": "未找到 cppcheck，请先安装",
                    "errors": [],
                    "warnings": [],
                    "statistics": {}
                }
            
            # 构建额外参数
            extra_args = []
            if cppcheck_options:
                # 处理检查级别
                if cppcheck_options.get('inconclusive'):
                    extra_args.append('--inconclusive')
                
                # 处理线程数
                jobs = cppcheck_options.get('jobs')
                if jobs and jobs > 1:
                    extra_args.append(f'-j{jobs}')
                
                # 处理最大配置数
                max_configs = cppcheck_options.get('max_configs')
                if max_configs:
                    extra_args.append(f'--max-configs={max_configs}')
                
                # 处理平台
                platform = cppcheck_options.get('platform')
                if platform:
                    extra_args.append(f'--platform={platform}')
                
                # 处理标准
                std = cppcheck_options.get('std')
                if std:
                    extra_args.append(f'--std={std}')
            
            # 记录参数信息
            logger.info(f"分析参数: enable_checks={enable_checks}, extra_args={extra_args}, cppcheck_options={cppcheck_options}")
            
            # 创建分析器并执行分析
            analyzer = StaticAnalyzer(project_dir)
            result = analyzer.analyze(
                include_paths=include_paths,
                enable_checks=enable_checks,  # 直接传递，不做默认值处理
                severity=severity,
                extra_args=extra_args if extra_args else None
            )
            
            logger.info(f"项目分析完成: {result.get('message')}")
            return result
            
        except Exception as e:
            logger.error(f"分析项目失败: {e}")
            return {
                "success": False,
                "message": f"分析失败: {str(e)}",
                "errors": [],
                "warnings": [],
                "statistics": {}
            }
    
    def analyze_file(self, project_dir: str, file_path: str) -> Dict[str, any]:
        """
        分析单个文件
        
        Args:
            project_dir: 项目目录
            file_path: 文件路径（相对于项目目录）
        
        Returns:
            分析结果字典
        """
        try:
            # 检查 cppcheck 是否可用
            if not self.cppcheck_manager.get_cppcheck_path():
                return {
                    "success": False,
                    "message": "未找到 cppcheck，请先安装",
                    "issues": []
                }
            
            # 创建分析器并执行分析
            analyzer = StaticAnalyzer(project_dir)
            result = analyzer.analyze_file(file_path)
            
            logger.info(f"文件分析完成: {result.get('message')}")
            return result
            
        except Exception as e:
            logger.error(f"分析文件失败: {e}")
            return {
                "success": False,
                "message": f"分析失败: {str(e)}",
                "issues": []
            }
