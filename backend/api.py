"""
PyWebView JS Bridge API
暴露 Python 功能给前端 JavaScript
"""
from pathlib import Path
from typing import Dict, List
from core.calculator import add, subtract, multiply, divide, power
from core.user_service import UserService
from core.qt_project import (
    scan_qt_projects, 
    scan_directory_tree,
    scan_unit_tests,
    run_unit_test,
    run_ui_test,
    TestRecorder,
    analyze_test_failure,
)
from core.database import TestDatabase
from core.services import VisualAgent
from backend.static_analysis_api import StaticAnalysisAPI
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
        # 初始化测试数据库和记录器
        self.test_db = TestDatabase()
        self.test_recorder = TestRecorder(self.test_db)
        # 初始化视觉测试代理
        self.visual_agent = VisualAgent()
        # 初始化静态分析 API
        self.static_analysis_api = StaticAnalysisAPI()
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
        logger.info(f"获取文件树: {project_path}")
        tree = scan_directory_tree(project_path)
        return [node.to_dict() for node in tree]
    
    def scan_unit_tests(self, project_path: str) -> List[Dict]:
        """
        扫描项目的单元测试
        
        Args:
            project_path: 项目路径
            
        Returns:
            单元测试文件列表
        """
        logger.info(f"扫描单元测试: {project_path}")
        tests = scan_unit_tests(project_path)
        return [test.to_dict() for test in tests]
    
    def run_unit_test(self, executable_path: str, test_name: str, project_path: str) -> Dict:
        """
        运行单元测试并记录
        
        Args:
            executable_path: 测试可执行文件路径
            test_name: 测试名称
            project_path: 项目路径
            
        Returns:
            测试结果（含 run_id）
        """
        logger.info(f"运行单元测试: {test_name}, 项目路径: {project_path}")
        result = run_unit_test(executable_path, test_name)
        logger.info(f"测试执行完成: {test_name}, 状态: {result.status}")
        
        # 记录到数据库（不包含 AI 分析）
        logger.info(f"准备记录测试结果到数据库...")
        run_id = self.test_recorder.record_unit_test(project_path, result, ai_analysis=None)
        logger.info(f"测试结果已记录，run_id: {run_id}")
        
        result_dict = result.to_dict()
        result_dict["run_id"] = run_id
        
        return result_dict
    
    def run_ui_test_with_record(self, executable_path: str, test_name: str, project_path: str) -> Dict:
        """
        运行 UI 测试并记录（含截图）
        
        Args:
            executable_path: 测试可执行文件路径
            test_name: 测试名称
            project_path: 项目路径
            
        Returns:
            测试结果（含 run_id）
        """
        logger.info(f"运行 UI 测试: {test_name}")
        result = run_ui_test(executable_path, test_name, project_path)
        
        # 记录到数据库（含截图）
        run_id = self.test_recorder.record_ui_test(project_path, result)
        
        return {**result.to_dict(), "run_id": run_id}
    
    def analyze_test_failure(
        self, 
        project_path: str,
        test_name: str,
        test_file_path: str,
        failure_output: str,
        run_id: int = None
    ) -> str:
        """
        分析测试失败原因
        
        Args:
            project_path: 项目路径
            test_name: 测试名称
            test_file_path: 测试文件路径
            failure_output: 失败输出
            run_id: 测试运行ID（可选）
            
        Returns:
            AI 分析结果
        """
        logger.info(f"AI 分析测试失败: {test_name}, run_id: {run_id}")
        analysis = analyze_test_failure(
            project_path,
            test_name,
            test_file_path,
            failure_output
        )
        
        # 如果提供了 run_id，更新测试历史记录
        if run_id is not None:
            logger.info(f"更新测试历史的 AI 分析: run_id={run_id}")
            self.test_recorder.update_ai_analysis(run_id, analysis)
        
        return analysis
    
    def read_file_content(self, file_path: str) -> Dict:
        """
        读取文件内容
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件内容和类型信息
        """
        from pathlib import Path
        import base64
        import mimetypes
        
        logger.info(f"读取文件: {file_path}")
        
        try:
            file = Path(file_path)
            
            if not file.exists():
                return {"error": "文件不存在", "content": None}
            
            if not file.is_file():
                return {"error": "不是文件", "content": None}
            
            # 获取文件扩展名
            ext = file.suffix.lower()
            
            # 判断是否为图片文件
            image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp', '.ico', '.tiff', '.tif'}
            
            if ext in image_extensions:
                # 读取图片文件为 base64
                try:
                    with open(file, 'rb') as f:
                        image_data = f.read()
                    
                    # 转换为 base64
                    base64_data = base64.b64encode(image_data).decode('utf-8')
                    
                    # 获取 MIME 类型
                    mime_type = mimetypes.guess_type(file_path)[0] or 'image/png'
                    
                    logger.info(f"成功读取图片: {file_path}, 大小: {len(image_data)} bytes")
                    
                    return {
                        "content": base64_data,
                        "size": file.stat().st_size,
                        "error": None,
                        "is_image": True,
                        "mime_type": mime_type
                    }
                except Exception as e:
                    logger.error(f"读取图片失败: {e}")
                    return {"error": f"读取图片失败: {str(e)}", "content": None}
            
            # 读取文本文件内容
            try:
                content = file.read_text(encoding='utf-8')
                logger.info(f"成功读取文本文件: {file_path}, 大小: {len(content)} 字符")
                return {
                    "content": content,
                    "size": file.stat().st_size,
                    "error": None,
                    "is_image": False
                }
            except UnicodeDecodeError:
                # 二进制文件（非图片）
                logger.warning(f"无法读取二进制文件: {file_path}")
                return {
                    "error": "无法读取二进制文件（非图片格式）",
                    "content": None,
                    "is_binary": True
                }
        except Exception as e:
            logger.error(f"读取文件失败: {e}")
            return {"error": str(e), "content": None}
    
    # ==================== 测试历史记录 API ====================
    
    def get_test_history(self, project_path: str, limit: int = 50) -> List[Dict]:
        """
        获取测试历史记录
        
        Args:
            project_path: 项目路径
            limit: 返回记录数量
            
        Returns:
            测试历史列表
        """
        logger.info(f"获取测试历史: {project_path}")
        runs = self.test_db.get_test_runs(project_path, limit)
        return [run.to_dict() for run in runs]
    
    def get_test_detail(self, run_id: int) -> Dict:
        """
        获取测试详情（含用例详情和截图）
        
        Args:
            run_id: 测试运行 ID
            
        Returns:
            测试详情
        """
        logger.info(f"获取测试详情: run_id={run_id}")
        detail = self.test_db.get_test_run_detail(run_id)
        if detail:
            return detail.to_dict()
        return {"error": "测试记录不存在"}
    
    def update_test_ai_analysis(self, run_id: int, analysis: str) -> Dict:
        """
        更新测试的 AI 分析报告
        
        Args:
            run_id: 测试运行 ID
            analysis: AI 分析内容
            
        Returns:
            操作结果
        """
        logger.info(f"更新 AI 分析: run_id={run_id}")
        self.test_recorder.update_ai_analysis(run_id, analysis)
        return {"success": True}
    
    def get_test_statistics(self, project_path: str) -> Dict:
        """
        获取项目测试统计
        
        Args:
            project_path: 项目路径
            
        Returns:
            统计信息
        """
        logger.info(f"获取测试统计: {project_path}")
        return self.test_db.get_statistics(project_path)
    
    def cleanup_old_tests(self, days: int = 30) -> Dict:
        """
        清理旧测试记录
        
        Args:
            days: 保留天数
            
        Returns:
            清理结果
        """
        logger.info(f"清理 {days} 天前的测试记录")
        deleted = self.test_db.cleanup_old_records(days)
        return {"deleted": deleted, "success": True}
    
    # ==================== 静态分析 API ====================
    
    def check_cppcheck_status(self) -> Dict:
        """
        检查 cppcheck 安装状态
        
        Returns:
            状态信息
        """
        return self.static_analysis_api.check_cppcheck_status()
    
    def install_cppcheck(self) -> Dict:
        """
        安装 cppcheck
        
        Returns:
            安装结果
        """
        return self.static_analysis_api.install_cppcheck()
    
    def analyze_project_static(
        self,
        project_dir: str,
        include_paths: List[str] = None,
        enable_checks: List[str] = None,
        severity: str = "warning",
        cppcheck_options: Dict = None
    ) -> Dict:
        """
        对项目进行静态代码分析
        
        Args:
            project_dir: 项目目录
            include_paths: 额外的头文件搜索路径
            enable_checks: 启用的检查类型
            severity: 严重程度过滤
            cppcheck_options: cppcheck 选项配置
            
        Returns:
            分析结果
        """
        return self.static_analysis_api.analyze_project(
            project_dir=project_dir,
            include_paths=include_paths,
            enable_checks=enable_checks,
            severity=severity,
            cppcheck_options=cppcheck_options
        )
    
    def analyze_file_static(self, project_dir: str, file_path: str) -> Dict:
        """
        对单个文件进行静态代码分析
        
        Args:
            project_dir: 项目目录
            file_path: 文件路径（相对于项目目录）
            
        Returns:
            分析结果
        """
        return self.static_analysis_api.analyze_file(project_dir, file_path)
    
    # ==================== 视觉测试 API ====================
    
    def launch_target_app(self) -> Dict:
        """启动被测应用程序"""
        try:
            return self.visual_agent.launch_target_app()
        except Exception as e:
            logger.error(f"启动应用错误: {e}")
            return {"success": False, "error": str(e)}
    
    def close_target_app(self) -> Dict:
        """关闭被测应用程序"""
        try:
            return self.visual_agent.close_target_app()
        except Exception as e:
            logger.error(f"关闭应用错误: {e}")
            return {"success": False, "error": str(e)}
    
    def get_screen_frame(self) -> Dict:
        """获取屏幕截图帧"""
        try:
            return self.visual_agent.get_screen_frame()
        except Exception as e:
            logger.error(f"截屏错误: {e}")
            return {"success": False, "error": str(e)}
    
    def get_window_info(self) -> Dict:
        """获取窗口信息"""
        try:
            return self.visual_agent.get_window_info()
        except Exception as e:
            logger.error(f"获取窗口错误: {e}")
            return {"success": False, "error": str(e)}
    
    def focus_target_window(self, window_title: str = None) -> Dict:
        """聚焦目标窗口"""
        try:
            return self.visual_agent.focus_target_window(window_title)
        except Exception as e:
            logger.error(f"聚焦窗口错误: {e}")
            return {"success": False, "error": str(e)}
    
    def run_stress_test(self, iterations: int = 10) -> Dict:
        """运行压力测试"""
        try:
            return self.visual_agent.run_stress_test(iterations)
        except Exception as e:
            logger.error(f"压力测试错误: {e}")
            return {"success": False, "error": str(e)}
    
    def execute_ai_command(self, command: str) -> Dict:
        """执行 AI 自然语言指令"""
        try:
            return self.visual_agent.execute_ai_command(command)
        except Exception as e:
            logger.error(f"AI 指令错误: {e}")
            return {"success": False, "error": str(e)}
    
    def verify_visual_result(self, pattern: str) -> Dict:
        """验证视觉结果"""
        try:
            return self.visual_agent.verify_visual_result(pattern)
        except Exception as e:
            logger.error(f"视觉验证错误: {e}")
            return {"success": False, "error": str(e)}
    
    def set_ai_api_key(self, api_key: str, base_url: str = None) -> Dict:
        """设置 AI API Key（支持讯飞星火等）"""
        try:
            from openai import OpenAI
            self.visual_agent.ai_client = OpenAI(
                api_key=api_key,
                base_url=base_url or "https://spark-api-open.xf-yun.com/v1"
            )
            logger.info(f"AI API Key 已设置 (Base URL: {base_url or '讯飞星火'})")
            return {"success": True, "message": "API Key 设置成功"}
        except Exception as e:
            logger.error(f"设置 API Key 错误: {e}")
            return {"success": False, "error": str(e)}

    # ==================== MAA 风格视觉识别 API ====================

    def find_template(
        self, 
        template_path: str, 
        threshold: float = 0.7,
        roi: List = None
    ) -> Dict:
        """
        模板匹配 - 在屏幕上查找模板图片
        
        Args:
            template_path: 模板图片路径
            threshold: 匹配阈值 (0-1)
            roi: 搜索区域 [x, y, width, height]
        """
        try:
            return self.visual_agent.find_template(template_path, threshold, roi)
        except Exception as e:
            logger.error(f"模板匹配错误: {e}")
            return {"success": False, "error": str(e)}

    def find_color(
        self,
        lower: List,
        upper: List,
        roi: List = None,
        color_space: str = "HSV",
        min_count: int = 100
    ) -> Dict:
        """
        颜色匹配 - 在屏幕上查找指定颜色
        
        Args:
            lower: 颜色下限 (如 HSV: [0, 100, 100])
            upper: 颜色上限 (如 HSV: [10, 255, 255])
            roi: 搜索区域 [x, y, width, height]
            color_space: 颜色空间 ("HSV" | "RGB" | "BGR")
            min_count: 最少像素数
        """
        try:
            return self.visual_agent.find_color(lower, upper, roi, color_space, min_count)
        except Exception as e:
            logger.error(f"颜色匹配错误: {e}")
            return {"success": False, "error": str(e)}

    def click_template(
        self,
        template_path: str,
        threshold: float = 0.7,
        roi: List = None,
        offset: List = None
    ) -> Dict:
        """
        找图并点击 - 查找模板并点击其中心
        
        Args:
            template_path: 模板图片路径
            threshold: 匹配阈值
            roi: 搜索区域
            offset: 点击偏移 [x, y]
        """
        try:
            return self.visual_agent.click_template(template_path, threshold, roi, offset)
        except Exception as e:
            logger.error(f"找图点击错误: {e}")
            return {"success": False, "error": str(e)}

    def wait_for_template(
        self,
        template_path: str,
        threshold: float = 0.7,
        timeout: int = 10000,
        interval: int = 500,
        roi: List = None
    ) -> Dict:
        """
        等待模板出现
        
        Args:
            template_path: 模板图片路径
            threshold: 匹配阈值
            timeout: 超时时间 (ms)
            interval: 检测间隔 (ms)
            roi: 搜索区域
        """
        try:
            return self.visual_agent.wait_for_template(
                template_path, threshold, timeout, interval, roi
            )
        except Exception as e:
            logger.error(f"等待模板错误: {e}")
            return {"success": False, "error": str(e)}

    def run_pipeline(
        self,
        config: Dict,
        entry: str,
        resource_dir: str = None
    ) -> Dict:
        """
        运行视觉测试流水线
        
        Args:
            config: Pipeline 配置 (JSON 格式的字典)
            entry: 入口节点名
            resource_dir: 资源目录（模板图片等）
        """
        try:
            return self.visual_agent.run_pipeline(config, entry, resource_dir)
        except Exception as e:
            logger.error(f"Pipeline 错误: {e}")
            return {"success": False, "error": str(e)}

    def run_pipeline_from_file(
        self,
        json_path: str,
        entry: str,
        resource_dir: str = None
    ) -> Dict:
        """
        从 JSON 文件运行 Pipeline
        
        Args:
            json_path: Pipeline 配置文件路径
            entry: 入口节点名
            resource_dir: 资源目录
        """
        try:
            return self.visual_agent.run_pipeline_from_file(json_path, entry, resource_dir)
        except Exception as e:
            logger.error(f"Pipeline 文件错误: {e}")
            return {"success": False, "error": str(e)}

    def get_vision_capabilities(self) -> Dict:
        """获取视觉识别能力信息"""
        try:
            return self.visual_agent.get_vision_capabilities()
        except Exception as e:
            logger.error(f"获取视觉能力错误: {e}")
            return {"success": False, "error": str(e)}

    def scan_pipeline_tests(self, directory: str = None) -> List[Dict]:
        """
        扫描 Pipeline 测试配置文件
        
        Args:
            directory: 扫描目录，默认为 core/vision/examples
        """
        import json
        from pathlib import Path
        
        try:
            if directory:
                scan_dir = Path(directory)
            else:
                # 默认扫描 core/vision/examples 和 playground 下的 pipeline 目录
                base_dir = Path(__file__).parent.parent
                scan_dirs = [
                    base_dir / "core" / "vision" / "examples",
                    base_dir / "playground",
                ]
                
                pipelines = []
                for scan_dir in scan_dirs:
                    if scan_dir.exists():
                        pipelines.extend(self._scan_pipeline_dir(scan_dir))
                
                return pipelines
            
            if not scan_dir.exists():
                return []
            
            return self._scan_pipeline_dir(scan_dir)
            
        except Exception as e:
            logger.error(f"扫描 Pipeline 错误: {e}")
            return []
    
    def _scan_pipeline_dir(self, directory: Path) -> List[Dict]:
        """递归扫描目录中的 Pipeline JSON 文件"""
        import json
        
        pipelines = []
        
        for json_file in directory.rglob("*pipeline*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                # 提取节点名作为可用入口
                entries = [
                    name for name in config.keys() 
                    if not name.startswith('$')
                ]
                
                # 获取描述信息
                description = config.get('$description', '') or config.get('$comment', '')
                
                pipelines.append({
                    "name": json_file.stem,
                    "path": str(json_file),
                    "entries": entries,
                    "description": description,
                    "node_count": len(entries),
                })
            except Exception as e:
                logger.warning(f"解析 Pipeline 文件失败: {json_file}, {e}")
                continue
        
        return pipelines

    def run_pipeline_test(
        self,
        pipeline_path: str,
        entry: str,
        launch_app: bool = True,
        resource_dir: str = None
    ) -> Dict:
        """
        运行 Pipeline 测试
        
        Args:
            pipeline_path: Pipeline 配置文件路径
            entry: 入口节点名
            launch_app: 是否先启动被测应用
            resource_dir: 资源目录（模板图片等），不提供则使用 pipeline 所在目录
        """
        try:
            import time
            import json
            from pathlib import Path
            
            result = {
                "success": False,
                "pipeline_path": pipeline_path,
                "entry": entry,
                "app_launched": False,
                "pipeline_result": None,
                "resource_dir": None,
                "error": None
            }
            
            # 可选：先启动应用
            if launch_app:
                launch_result = self.visual_agent.launch_target_app()
                result["app_launched"] = launch_result.get("success", False)
                if result["app_launched"]:
                    time.sleep(2)  # 等待应用启动
            
            # 智能确定资源目录
            pipeline_file = Path(pipeline_path)
            
            if resource_dir:
                # 使用提供的资源目录
                final_resource_dir = resource_dir
            else:
                # 尝试从 pipeline 配置文件读取 $resource_base
                try:
                    with open(pipeline_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    resource_base = config.get('$resource_base')
                    if resource_base:
                        # 相对路径：基于 pipeline 文件所在目录解析
                        resource_path = Path(resource_base)
                        if not resource_path.is_absolute():
                            resource_path = (pipeline_file.parent / resource_base).resolve()
                        final_resource_dir = str(resource_path)
                    else:
                        final_resource_dir = str(pipeline_file.parent)
                except:
                    final_resource_dir = str(pipeline_file.parent)
            
            result["resource_dir"] = final_resource_dir
            logger.info(f"Pipeline 资源目录: {final_resource_dir}")
            
            # 运行 Pipeline
            pipeline_result = self.visual_agent.run_pipeline_from_file(
                pipeline_path, 
                entry, 
                final_resource_dir
            )
            
            result["pipeline_result"] = pipeline_result
            result["success"] = pipeline_result.get("success", False)
            
            return result
            
        except Exception as e:
            logger.error(f"运行 Pipeline 测试错误: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ==================== 编辑器集成 API ====================
    
    def open_file_at_line(self, file_path: str, line: int, column: int = 1) -> Dict:
        """在 VS Code 中打开文件并跳转到指定行列
        
        Args:
            file_path: 文件路径
            line: 行号
            column: 列号（默认为1）
        
        Returns:
            操作结果
        """
        import subprocess
        from pathlib import Path
        
        try:
            file = Path(file_path)
            
            # 检查文件是否存在
            if not file.exists():
                logger.error(f"文件不存在: {file_path}")
                return {"success": False, "error": "文件不存在"}
            
            # 构建 VS Code 命令：code -g file:line:column
            # -g 参数表示跳转到指定位置
            # -r 参数表示在当前窗口打开
            cmd = ["code", "-r", "-g", f"{file_path}:{line}:{column}"]
            
            logger.info(f"执行命令: {' '.join(cmd)}")
            
            # 执行命令
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                logger.info(f"成功打开文件: {file_path} at {line}:{column}")
                return {
                    "success": True,
                    "message": f"已跳转到 {file.name} 的第 {line} 行"
                }
            else:
                logger.error(f"打开文件失败: {result.stderr}")
                return {
                    "success": False,
                    "error": result.stderr or "执行失败"
                }
        
        except subprocess.TimeoutExpired:
            logger.error("打开文件超时")
            return {"success": False, "error": "操作超时"}
        except Exception as e:
            logger.error(f"打开文件错误: {e}")
            return {"success": False, "error": str(e)}
