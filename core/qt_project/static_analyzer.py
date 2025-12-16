"""
静态代码分析器
使用 cppcheck 对 Qt 项目进行静态分析
"""
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from core.utils.logger import logger
from core.qt_project.cppcheck_manager import CppcheckManager


class StaticAnalyzer:
    """使用 cppcheck 进行静态代码分析"""
    
    def __init__(self, project_dir: str):
        """
        初始化静态分析器
        
        Args:
            project_dir: Qt 项目目录
        """
        self.project_dir = Path(project_dir)
        self.cppcheck_manager = CppcheckManager()
        
    def analyze(
        self,
        include_paths: Optional[List[str]] = None,
        enable_checks: Optional[List[str]] = None,
        severity: str = "warning"
    ) -> Dict[str, any]:
        """
        执行静态代码分析
        
        Args:
            include_paths: 额外的头文件搜索路径
            enable_checks: 启用的检查类型 (如 ["all", "style", "performance"])
            severity: 严重程度过滤 (error, warning, style, performance, portability, information)
        
        Returns:
            分析结果字典
        """
        # 获取 cppcheck 路径
        cppcheck_path = self.cppcheck_manager.get_cppcheck_path()
        if not cppcheck_path:
            return {
                "success": False,
                "message": "未找到 cppcheck，请先安装",
                "errors": [],
                "warnings": [],
                "statistics": {}
            }
        
        # 构建命令
        cmd = [
            cppcheck_path,
            "--enable=all",  # 启用所有检查（包括 style, performance, portability, information）
            "--xml",  # 输出 XML 格式
            "--xml-version=2",
            "--verbose",  # 详细输出
            "--force",  # 强制检查所有配置
            "--suppress=missingIncludeSystem",  # 忽略系统头文件
            "--suppress=unmatchedSuppression",
            "--inline-suppr",  # 允许内联抑制
        ]
        
        # 添加 include 路径
        if include_paths:
            for path in include_paths:
                cmd.append(f"-I{path}")
        
        # 添加自定义检查
        if enable_checks:
            cmd.append(f"--enable={','.join(enable_checks)}")
        
        # 扫描源文件
        cpp_files = list(self.project_dir.glob("*.cpp"))
        h_files = list(self.project_dir.glob("*.h"))
        
        if not cpp_files and not h_files:
            return {
                "success": False,
                "message": "未找到 C++ 源文件",
                "errors": [],
                "warnings": [],
                "statistics": {}
            }
        
        # 添加源文件到命令
        for f in cpp_files + h_files:
            cmd.append(str(f))
        
        logger.info(f"执行 cppcheck: {' '.join(cmd)}")
        
        try:
            # 执行 cppcheck
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5分钟超时
                cwd=str(self.project_dir)
            )
            
            # cppcheck 将结果输出到 stderr（XML 格式）
            xml_output = result.stderr
            
            # 输出调试信息
            logger.info(f"Cppcheck 返回码: {result.returncode}")
            logger.info(f"Stderr 长度: {len(xml_output)} 字符")
            logger.info(f"Stdout 长度: {len(result.stdout)} 字符")
            
            # 如果 stderr 为空，检查 stdout
            if not xml_output and result.stdout:
                xml_output = result.stdout
                logger.warning("Cppcheck 输出到 stdout 而不是 stderr")
            
            if not xml_output or '<results' not in xml_output:
                logger.warning(f"未找到有效的 XML 输出，可能 cppcheck 运行失败或没有发现问题")
                logger.debug(f"Stderr 内容: {result.stderr[:500]}")
                logger.debug(f"Stdout 内容: {result.stdout[:500]}")
                return {
                    "success": True,
                    "message": "分析完成，未发现问题（或 cppcheck 输出格式异常）",
                    "errors": [],
                    "warnings": [],
                    "statistics": {
                        "files_checked": len(cpp_files) + len(h_files),
                        "total_issues": 0
                    }
                }
            
            # 解析 XML 输出
            issues = self._parse_xml_output(xml_output)
            
            # 按严重程度分类
            errors = [i for i in issues if i["severity"] == "error"]
            warnings = [i for i in issues if i["severity"] in ["warning", "style", "performance", "portability"]]
            
            # 按错误类型分类统计
            categories = {}
            severity_stats = {
                "error": 0,
                "warning": 0,
                "style": 0,
                "performance": 0,
                "portability": 0,
                "information": 0
            }
            
            for issue in issues:
                # 统计错误类型（id）
                issue_id = issue.get("id", "unknown")
                if issue_id not in categories:
                    categories[issue_id] = {
                        "id": issue_id,
                        "severity": issue.get("severity", "unknown"),
                        "count": 0,
                        "message": issue.get("message", ""),
                        "issues": []
                    }
                categories[issue_id]["count"] += 1
                categories[issue_id]["issues"].append(issue)
                
                # 统计严重程度
                severity = issue.get("severity", "information")
                if severity in severity_stats:
                    severity_stats[severity] += 1
            
            # 转换为列表并按数量排序
            category_list = sorted(categories.values(), key=lambda x: x["count"], reverse=True)
            
            return {
                "success": True,
                "message": f"分析完成，发现 {len(issues)} 个问题",
                "errors": errors,
                "warnings": warnings,
                "categories": category_list,
                "statistics": {
                    "files_checked": len(cpp_files) + len(h_files),
                    "total_issues": len(issues),
                    "error_count": len(errors),
                    "warning_count": len(warnings),
                    "severity_stats": severity_stats,
                    "category_count": len(categories),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except subprocess.TimeoutExpired:
            logger.error("Cppcheck 执行超时")
            return {
                "success": False,
                "message": "分析超时（超过5分钟）",
                "errors": [],
                "warnings": [],
                "statistics": {}
            }
        except Exception as e:
            logger.error(f"分析失败: {e}")
            return {
                "success": False,
                "message": f"分析失败: {str(e)}",
                "errors": [],
                "warnings": [],
                "statistics": {}
            }
    
    def _parse_xml_output(self, xml_text: str) -> List[Dict[str, any]]:
        """
        解析 cppcheck XML 输出
        
        Args:
            xml_text: XML 文本
        
        Returns:
            问题列表
        """
        issues = []
        
        try:
            root = ET.fromstring(xml_text)
            
            # 遍历所有 error 元素
            for error in root.findall(".//error"):
                # 获取错误信息
                error_id = error.get("id", "unknown")
                severity = error.get("severity", "unknown")
                msg = error.get("msg", "")
                verbose = error.get("verbose", msg)
                
                # 获取位置信息
                locations = []
                for location in error.findall("location"):
                    file_path = location.get("file", "")
                    line = location.get("line", "0")
                    column = location.get("column", "0")
                    
                    # 转换为相对路径
                    try:
                        rel_path = Path(file_path).relative_to(self.project_dir)
                    except ValueError:
                        rel_path = Path(file_path).name
                    
                    locations.append({
                        "file": str(rel_path),
                        "line": int(line),
                        "column": int(column)
                    })
                
                if locations:
                    issues.append({
                        "id": error_id,
                        "severity": severity,
                        "message": msg,
                        "verbose": verbose,
                        "locations": locations
                    })
            
        except ET.ParseError as e:
            logger.error(f"解析 XML 失败: {e}")
        
        return issues
    
    def analyze_file(self, file_path: str) -> Dict[str, any]:
        """
        分析单个文件
        
        Args:
            file_path: 文件路径（相对于项目根目录）
        
        Returns:
            分析结果
        """
        cppcheck_path = self.cppcheck_manager.get_cppcheck_path()
        if not cppcheck_path:
            return {
                "success": False,
                "message": "未找到 cppcheck",
                "issues": []
            }
        
        full_path = self.project_dir / file_path
        if not full_path.exists():
            return {
                "success": False,
                "message": f"文件不存在: {file_path}",
                "issues": []
            }
        
        cmd = [
            cppcheck_path,
            "--enable=all",
            "--xml",
            "--xml-version=2",
            "--suppress=missingIncludeSystem",
            str(full_path)
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            issues = self._parse_xml_output(result.stderr)
            
            return {
                "success": True,
                "message": f"分析完成，发现 {len(issues)} 个问题",
                "issues": issues
            }
            
        except Exception as e:
            logger.error(f"分析文件失败: {e}")
            return {
                "success": False,
                "message": f"分析失败: {str(e)}",
                "issues": []
            }
