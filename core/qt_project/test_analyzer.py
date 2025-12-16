"""
测试分析器
整合测试结果、源代码和 AI 分析
"""
from pathlib import Path
from typing import Dict
from .cmake_parser import get_source_files_for_test
from core.ai import get_deepseek_client
from core.utils.logger import logger


def analyze_test_failure(
    project_path: str,
    test_name: str,
    test_file_path: str,
    failure_output: str
) -> str:
    """
    分析测试失败
    
    Args:
        project_path: 项目路径
        test_name: 测试名称
        test_file_path: 测试文件路径
        failure_output: 失败输出
        
    Returns:
        AI 分析结果
    """
    try:
        # 1. 读取测试代码
        test_code = Path(test_file_path).read_text(encoding='utf-8', errors='ignore')
        
        # 2. 获取被测源文件
        source_files = get_source_files_for_test(project_path, test_name)
        
        # 3. 读取源代码
        source_code = {}
        for file_path in source_files[:5]:  # 限制最多 5 个文件，避免上下文过长
            try:
                filename = Path(file_path).name
                code = Path(file_path).read_text(encoding='utf-8', errors='ignore')
                # 限制每个文件最多 500 行
                lines = code.split('\n')[:500]
                source_code[filename] = '\n'.join(lines)
            except Exception as e:
                logger.warning(f"读取源文件失败 {file_path}: {e}")
        
        # 4. 调用 AI 分析
        client = get_deepseek_client()
        if not client.is_available():
            return "AI 分析服务不可用，请在 .env 文件中配置 SPARK_API_KEY"
        
        analysis = client.analyze_test_failure(
            test_name=test_name,
            test_code=test_code,
            source_code=source_code,
            failure_details=failure_output
        )
        
        return analysis
        
    except Exception as e:
        logger.error(f"分析测试失败: {e}")
        return f"分析失败: {str(e)}"
