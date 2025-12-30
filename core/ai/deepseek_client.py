"""
讯飞星火 AI 客户端
用于分析单元测试失败原因
"""
import os
from openai import OpenAI
from dotenv import load_dotenv
from core.utils.logger import logger

# 加载环境变量
load_dotenv()


class SparkClient:
    """讯飞星火 AI 客户端"""
    
    def __init__(self):
        api_key = os.getenv('SPARK_API_KEY')
        base_url = os.getenv('SPARK_BASE_URL', 'http://maas-api.cn-huabei-1.xf-yun.com/v1')
        model = os.getenv('SPARK_MODEL', 'xop3qwen1b7')
        
        if not api_key:
            logger.warning("未配置 SPARK_API_KEY，AI 分析功能将不可用")
            self.client = None
            self.model = None
        else:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            self.model = model
    
    def is_available(self) -> bool:
        """检查 AI 服务是否可用"""
        return self.client is not None
    
    def analyze_test_failure(
        self,
        test_name: str,
        test_code: str,
        source_code: dict,
        failure_details: str
    ) -> str:
        """
        分析测试失败原因
        
        Args:
            test_name: 测试名称
            test_code: 测试代码
            source_code: 被测源代码 {文件名: 代码内容}
            failure_details: 失败详情
            
        Returns:
            AI 分析结果
        """
        if not self.is_available():
            return "AI 分析服务不可用，请配置 SPARK_API_KEY"
        
        # 构建上下文
        source_context = "\n\n".join([
            f"=== {filename} ===\n{code}"
            for filename, code in source_code.items()
        ])
        
        # 构建提示词
        prompt = f"""你是一个 C++ 和 Qt 测试专家。请分析以下单元测试失败的原因。

## 测试信息
测试名称：{test_name}

## 失败详情
{failure_details}

## 测试代码
```cpp
{test_code}
```

## 被测源代码
{source_context}

## 请提供：
1. **测试文件概要**：
   - 简要说明该测试文件的目的和测试范围
   - 列出测试文件中包含的主要测试用例（函数名）
   - 说明这些测试用例分别测试什么功能
   
2. **失败原因分析**：解释为什么测试失败

3. **问题定位**：指出具体是哪部分代码导致的问题

4. **修复建议**：给出具体的修复方案

5. **代码示例**：如果需要，提供修复后的代码片段

## 输出格式要求：
- 使用 Markdown 格式输出
- 代码块必须使用 ```cpp 或 ```c++ 包裹
- 使用 ## 或 ### 作为标题
- 重要内容使用 **加粗**
- 列表使用 - 或 1. 2. 3.
- 保持简洁清晰，用中文回答"""
        
        try:
            logger.info(f"正在分析测试失败: {test_name}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的 C++ 和 Qt 测试专家，擅长分析单元测试失败原因并提供修复建议。"},
                    {"role": "user", "content": prompt}
                ],
                stream=False,
                temperature=0.3  # 降低温度以获得更确定的答案
            )
            
            analysis = response.choices[0].message.content
            logger.info(f"AI 分析完成: {test_name}")
            return analysis
            
        except Exception as e:
            logger.error(f"AI 分析失败: {e}")
            return f"AI 分析失败: {str(e)}"


# 全局单例
_client = None

def get_spark_client() -> SparkClient:
    """获取讯飞星火客户端单例"""
    global _client
    if _client is None:
        _client = SparkClient()
    return _client

# 兼容旧接口
get_deepseek_client = get_spark_client
DeepSeekClient = SparkClient
