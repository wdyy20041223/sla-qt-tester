"""
测试数据库管理器
使用 SQLite 存储测试历史和截图
"""
import sqlite3
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
from .models import TestRun, TestCaseDetail, Screenshot, TestRunDetail
from core.utils.logger import logger


class TestDatabase:
    """测试数据库管理"""
    
    def __init__(self, db_path: str = "test_history.db"):
        """
        初始化数据库
        
        Args:
            db_path: 数据库文件路径（相对于项目根目录）
        """
        # 数据库文件放在项目根目录
        project_root = Path(__file__).parent.parent.parent
        self.db_path = project_root / db_path
        self._init_database()
        logger.info(f"测试数据库初始化: {self.db_path}")
    
    def _init_database(self):
        """初始化数据库表"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 测试运行记录表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_path TEXT NOT NULL,
                    test_name TEXT NOT NULL,
                    test_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    total INTEGER DEFAULT 0,
                    passed INTEGER DEFAULT 0,
                    failed INTEGER DEFAULT 0,
                    skipped INTEGER DEFAULT 0,
                    duration TEXT,
                    output TEXT,
                    ai_analysis TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 测试用例详情表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_case_details (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL,
                    case_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT,
                    FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
                )
            """)
            
            # UI 测试截图表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_screenshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL,
                    step_number INTEGER NOT NULL,
                    step_name TEXT NOT NULL,
                    image_data BLOB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
                )
            """)
            
            # 创建索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_test_runs_project 
                ON test_runs(project_path)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_test_runs_created 
                ON test_runs(created_at DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_screenshots_run 
                ON test_screenshots(run_id)
            """)
            
            conn.commit()
    
    def save_test_run(self, run: TestRun) -> int:
        """
        保存测试运行记录
        
        Args:
            run: 测试运行记录
            
        Returns:
            run_id: 记录 ID
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO test_runs (
                    project_path, test_name, test_type, status,
                    total, passed, failed, skipped, duration, output, ai_analysis
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run.project_path, run.test_name, run.test_type, run.status,
                run.total, run.passed, run.failed, run.skipped, 
                run.duration, run.output, run.ai_analysis
            ))
            conn.commit()
            run_id = cursor.lastrowid
            logger.info(f"保存测试记录: {run.test_name} (ID: {run_id})")
            return run_id
    
    def save_test_case_details(self, run_id: int, details: List[TestCaseDetail]):
        """保存测试用例详情"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for detail in details:
                cursor.execute("""
                    INSERT INTO test_case_details (run_id, case_name, status, message)
                    VALUES (?, ?, ?, ?)
                """, (run_id, detail.case_name, detail.status, detail.message))
            conn.commit()
            logger.info(f"保存 {len(details)} 个测试用例详情")
    
    def save_screenshot(self, run_id: int, step_number: int, step_name: str, image_data: bytes):
        """
        保存截图到数据库
        
        Args:
            run_id: 测试运行 ID
            step_number: 步骤编号
            step_name: 步骤名称
            image_data: 图片二进制数据
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO test_screenshots (run_id, step_number, step_name, image_data)
                VALUES (?, ?, ?, ?)
            """, (run_id, step_number, step_name, image_data))
            conn.commit()
            logger.info(f"保存截图: {step_name} ({len(image_data)} bytes)")
    
    def get_test_runs(self, project_path: str, limit: int = 50) -> List[TestRun]:
        """
        获取测试历史记录
        
        Args:
            project_path: 项目路径
            limit: 返回记录数量
            
        Returns:
            测试记录列表
        """
        logger.info(f"查询测试历史: project_path={project_path}, limit={limit}")
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 先查询所有不同的项目路径（调试用）
            cursor.execute("SELECT DISTINCT project_path FROM test_runs")
            all_paths = [row[0] for row in cursor.fetchall()]
            logger.info(f"数据库中存在的项目路径: {all_paths}")
            
            cursor.execute("""
                SELECT * FROM test_runs
                WHERE project_path = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (project_path, limit))
            
            rows = cursor.fetchall()
            logger.info(f"查询到 {len(rows)} 条记录")
            return [TestRun(**dict(row)) for row in rows]
    
    def get_test_run_detail(self, run_id: int) -> Optional[TestRunDetail]:
        """
        获取测试运行详情（含用例和截图）
        
        Args:
            run_id: 测试运行 ID
            
        Returns:
            测试详情
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 获取测试运行记录
            cursor.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,))
            run_row = cursor.fetchone()
            if not run_row:
                return None
            
            run = TestRun(**dict(run_row))
            
            # 获取测试用例详情
            cursor.execute("""
                SELECT * FROM test_case_details WHERE run_id = ?
            """, (run_id,))
            detail_rows = cursor.fetchall()
            details = [TestCaseDetail(**dict(row)) for row in detail_rows]
            
            # 获取截图
            cursor.execute("""
                SELECT * FROM test_screenshots WHERE run_id = ?
                ORDER BY step_number
            """, (run_id,))
            screenshot_rows = cursor.fetchall()
            screenshots = [Screenshot(**dict(row)) for row in screenshot_rows]
            
            return TestRunDetail(run=run, details=details, screenshots=screenshots)
    
    def update_ai_analysis(self, run_id: int, analysis: str):
        """
        更新 AI 分析报告
        
        Args:
            run_id: 测试运行 ID
            analysis: AI 分析内容
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE test_runs SET ai_analysis = ? WHERE id = ?
            """, (analysis, run_id))
            conn.commit()
            logger.info(f"更新 AI 分析报告: run_id={run_id}")
    
    def cleanup_old_records(self, days: int = 30) -> int:
        """
        清理旧记录
        
        Args:
            days: 保留天数
            
        Returns:
            删除的记录数
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM test_runs WHERE created_at < ?
            """, (cutoff_date.isoformat(),))
            deleted = cursor.rowcount
            conn.commit()
            logger.info(f"清理了 {deleted} 条 {days} 天前的记录")
            return deleted
    
    def get_statistics(self, project_path: str) -> dict:
        """
        获取项目测试统计
        
        Args:
            project_path: 项目路径
            
        Returns:
            统计信息
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_runs,
                    SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_runs,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
                    COUNT(DISTINCT test_name) as unique_tests
                FROM test_runs
                WHERE project_path = ?
            """, (project_path,))
            
            row = cursor.fetchone()
            return {
                'total_runs': row[0] or 0,
                'passed_runs': row[1] or 0,
                'failed_runs': row[2] or 0,
                'unique_tests': row[3] or 0
            }
