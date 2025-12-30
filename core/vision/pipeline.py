"""
任务流水线 - Pipeline

实现 JSON 配置驱动的自动化任务

核心概念:
- Node: 单个节点，包含识别和动作
- Pipeline: 多个节点组成的流水线
- Entry: 任务入口节点
"""

import time
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable, Union
from pathlib import Path
from enum import Enum, auto
import numpy as np

try:
    import cv2
    import pyautogui
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False

from .types import Rect, RecoResult, MatchResult, Point
from .template_matcher import TemplateMatcher, TemplateMatcherParam
from .color_matcher import ColorMatcher, ColorMatcherParam
from .feature_matcher import FeatureMatcher, FeatureMatcherParam, FeatureDetector


class RecognitionType(Enum):
    """识别算法类型"""
    DIRECT_HIT = auto()      # 直接命中，不识别
    TEMPLATE_MATCH = auto()  # 模板匹配
    FEATURE_MATCH = auto()   # 特征匹配 (抗透视/旋转)
    COLOR_MATCH = auto()     # 颜色匹配
    # OCR = auto()           # 文字识别（可扩展）


class ActionType(Enum):
    """动作类型"""
    DO_NOTHING = auto()      # 不执行动作
    CLICK = auto()           # 点击
    LONG_PRESS = auto()      # 长按
    SWIPE = auto()           # 滑动
    INPUT_TEXT = auto()      # 输入文本
    WAIT = auto()            # 等待


@dataclass
class PipelineNode:
    """流水线节点
    
    参考 MAA 的节点设计，简化版本
    """
    name: str
    
    # 识别配置
    recognition: RecognitionType = RecognitionType.DIRECT_HIT
    recognition_param: Dict[str, Any] = field(default_factory=dict)
    
    # ROI 区域 [x, y, width, height]
    roi: Optional[List[int]] = None
    
    # 动作配置
    action: ActionType = ActionType.DO_NOTHING
    action_param: Dict[str, Any] = field(default_factory=dict)
    
    # 后续节点列表
    next: List[str] = field(default_factory=list)
    
    # 超时和重试
    timeout: int = 20000      # 超时时间 (ms)
    rate_limit: int = 1000    # 识别频率限制 (ms)
    
    # 延迟
    pre_delay: int = 200      # 动作前延迟 (ms)
    post_delay: int = 200     # 动作后延迟 (ms)
    
    # 反转识别结果
    inverse: bool = False
    
    # 是否启用
    enabled: bool = True
    
    @classmethod
    def from_dict(cls, name: str, data: Dict[str, Any]) -> 'PipelineNode':
        """从字典创建节点"""
        # 解析识别类型
        reco_type = RecognitionType.DIRECT_HIT
        reco_str = data.get('recognition', 'DirectHit')
        if reco_str == 'TemplateMatch':
            reco_type = RecognitionType.TEMPLATE_MATCH
        elif reco_str == 'FeatureMatch':
            reco_type = RecognitionType.FEATURE_MATCH
        elif reco_str == 'ColorMatch':
            reco_type = RecognitionType.COLOR_MATCH
        
        # 解析动作类型
        action_type = ActionType.DO_NOTHING
        action_str = data.get('action', 'DoNothing')
        if action_str == 'Click':
            action_type = ActionType.CLICK
        elif action_str == 'LongPress':
            action_type = ActionType.LONG_PRESS
        elif action_str == 'Swipe':
            action_type = ActionType.SWIPE
        elif action_str == 'InputText':
            action_type = ActionType.INPUT_TEXT
        elif action_str == 'Wait':
            action_type = ActionType.WAIT
        
        # 提取识别参数
        reco_param = {}
        if reco_type == RecognitionType.TEMPLATE_MATCH:
            reco_param = {
                'template': data.get('template', []),
                'threshold': data.get('threshold', [0.7]),
                'method': data.get('method', 5),
                'green_mask': data.get('green_mask', False),
                'multi_scale': data.get('multi_scale', True),
                'scale_range': data.get('scale_range', [0.5, 1.5]),
                'scale_step': data.get('scale_step', 0.1),
            }
        elif reco_type == RecognitionType.FEATURE_MATCH:
            reco_param = {
                'template': data.get('template', []),
                'detector': data.get('detector', 'AKAZE'),
                'ratio': data.get('ratio', 0.75),
                'count': data.get('count', 10),
                'green_mask': data.get('green_mask', False),
            }
        elif reco_type == RecognitionType.COLOR_MATCH:
            reco_param = {
                'lower': data.get('lower', []),
                'upper': data.get('upper', []),
                'method': data.get('method', 4),
                'count': data.get('count', 1),
                'connected': data.get('connected', False),
            }
        
        # 提取动作参数
        action_param = {}
        if action_type == ActionType.CLICK:
            action_param = {
                'target': data.get('target', True),
                'target_offset': data.get('target_offset', [0, 0, 0, 0]),
            }
        elif action_type == ActionType.SWIPE:
            action_param = {
                'begin': data.get('begin', True),
                'end': data.get('end', [0, 0]),
                'duration': data.get('duration', 200),
            }
        elif action_type == ActionType.INPUT_TEXT:
            action_param = {
                'input_text': data.get('input_text', ''),
            }
        elif action_type == ActionType.WAIT:
            action_param = {
                'duration': data.get('duration', 1000),
            }
        
        # 解析 next 列表
        next_nodes = data.get('next', [])
        if isinstance(next_nodes, str):
            next_nodes = [next_nodes]
        
        return cls(
            name=name,
            recognition=reco_type,
            recognition_param=reco_param,
            roi=data.get('roi'),
            action=action_type,
            action_param=action_param,
            next=next_nodes,
            timeout=data.get('timeout', 20000),
            rate_limit=data.get('rate_limit', 1000),
            pre_delay=data.get('pre_delay', 200),
            post_delay=data.get('post_delay', 200),
            inverse=data.get('inverse', False),
            enabled=data.get('enabled', True),
        )


@dataclass
class PipelineResult:
    """流水线执行结果"""
    success: bool = False
    entry: str = ""
    executed_nodes: List[str] = field(default_factory=list)
    last_node: str = ""
    last_reco_result: Optional[RecoResult] = None
    error: Optional[str] = None
    cost_ms: float = 0.0
    logs: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'entry': self.entry,
            'executed_nodes': self.executed_nodes,
            'last_node': self.last_node,
            'last_reco_result': self.last_reco_result.to_dict() if self.last_reco_result else None,
            'error': self.error,
            'cost_ms': self.cost_ms,
            'logs': self.logs,
        }


class Pipeline:
    """任务流水线
    
    通过 JSON 配置驱动的自动化任务执行器
    
    示例配置:
    ```json
    {
        "开始": {
            "recognition": "TemplateMatch",
            "template": ["start_button.png"],
            "threshold": [0.8],
            "action": "Click",
            "next": ["下一步"]
        },
        "下一步": {
            "recognition": "ColorMatch",
            "lower": [0, 100, 100],
            "upper": [10, 255, 255],
            "action": "Click"
        }
    }
    ```
    """
    
    def __init__(
        self,
        screen_capture_func: Optional[Callable[[], np.ndarray]] = None,
        resource_dir: Optional[str] = None
    ):
        """
        Args:
            screen_capture_func: 屏幕截图函数，返回 BGR 格式的 numpy 数组
            resource_dir: 资源目录（模板图片等）
        """
        self._nodes: Dict[str, PipelineNode] = {}
        self._screen_capture = screen_capture_func or self._default_screen_capture
        self._resource_dir = Path(resource_dir) if resource_dir else None
        self._running = False
        self._last_reco_results: Dict[str, RecoResult] = {}
        self._logs: List[str] = []
    
    def _default_screen_capture(self) -> np.ndarray:
        """默认屏幕截图"""
        if not CV_AVAILABLE:
            raise ImportError("OpenCV and pyautogui required")
        screenshot = pyautogui.screenshot()
        return cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
    
    def load_from_dict(self, config: Dict[str, Any]):
        """从字典加载配置"""
        self._nodes.clear()
        for name, data in config.items():
            if not name.startswith('$'):  # 跳过 $ 开头的字段
                node = PipelineNode.from_dict(name, data)
                self._nodes[name] = node
    
    def load_from_json(self, json_path: str):
        """从 JSON 文件加载配置"""
        path = Path(json_path)
        if not path.exists():
            raise FileNotFoundError(f"Pipeline config not found: {json_path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        self.load_from_dict(config)
    
    def run(self, entry: str) -> PipelineResult:
        """运行流水线
        
        Args:
            entry: 入口节点名
            
        Returns:
            执行结果
        """

        # 清空 log 文件夹
        import os, shutil
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'log')
        if os.path.exists(log_dir):
            for f in os.listdir(log_dir):
                fp = os.path.join(log_dir, f)
                try:
                    if os.path.isfile(fp):
                        os.remove(fp)
                except Exception:
                    pass

        start_time = time.perf_counter()
        self._running = True
        self._logs = []

        result = PipelineResult(entry=entry)

        if entry not in self._nodes:
            result.error = f"Entry node not found: {entry}"
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        

        try:
            current_node = entry
            # 截图文件名用节点名
            while self._running and current_node:
                node = self._nodes.get(current_node)
                if not node or not node.enabled:
                    break
                self._log(f"执行节点: {current_node}")
                # 执行识别
                reco_result = self._recognize(node)
                self._last_reco_results[current_node] = reco_result
                result.last_reco_result = reco_result
                # 检查识别结果
                success = reco_result.success
                if node.inverse:
                    success = not success
                # 识别失败也截图，文件名加_fail
                import cv2, pyautogui, os, re
                img = pyautogui.screenshot()
                img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                if reco_result.box:
                    box = reco_result.box
                    cv2.rectangle(img, (box.x, box.y), (box.x + box.width, box.y + box.height), (0,0,255), 3)
                log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'log')
                os.makedirs(log_dir, exist_ok=True)
                idx = list(self._nodes.keys()).index(str(current_node)) + 1
                # 文件名加_fail后缀表示失败
                if not success:
                    save_path = os.path.join(log_dir, f"node_{idx}_fail.png")
                else:
                    save_path = os.path.join(log_dir, f"node_{idx}.png")
                try:
                    cv2.imwrite(save_path, img)
                except Exception as e:
                    self._log(f"截图保存失败: {e}")
                if not success:
                    # 识别失败，尝试下一个 next 节点
                    next_node = self._find_next_node(node)
                    if next_node:
                        current_node = next_node
                        continue
                    else:
                        # 超时处理
                        self._log(f"节点 {current_node} 识别超时")
                        break
                self._log(f"识别成功，分数: {reco_result.score:.3f}")
                result.executed_nodes.append(current_node)
                result.last_node = current_node
                # 动作前延迟
                if node.pre_delay > 0:
                    time.sleep(node.pre_delay / 1000)
                self._execute_action(node, reco_result)
                # 动作后延迟
                if node.post_delay > 0:
                    time.sleep(node.post_delay / 1000)
                # 进入下一个节点
                if node.next:
                    current_node = node.next[0]  # 简化：取第一个
                else:
                    current_node = None
            result.success = len(result.executed_nodes) > 0
        except Exception as e:
            result.error = str(e)
            self._log(f"执行错误: {e}")
        finally:
            self._running = False
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            result.logs = self._logs.copy()
        return result
    
    def stop(self):
        """停止流水线"""
        self._running = False
    
    def _log(self, message: str):
        """记录日志"""
        timestamp = time.strftime("%H:%M:%S")
        log = f"[{timestamp}] {message}"
        self._logs.append(log)
        print(log)  # 也输出到控制台
    
    def _recognize(self, node: PipelineNode) -> RecoResult:
        """执行识别"""
        # 截图
        image = self._screen_capture()
        
        # 构建 ROI
        roi = None
        if node.roi:
            roi = Rect.from_list(node.roi)
        
        # 根据类型执行识别
        if node.recognition == RecognitionType.DIRECT_HIT:
            # 直接命中
            result = RecoResult(algorithm="DirectHit")
            result.best_result = MatchResult(
                box=roi or Rect(0, 0, image.shape[1], image.shape[0]),
                score=1.0
            )
            return result
        
        elif node.recognition == RecognitionType.TEMPLATE_MATCH:
            return self._template_match(image, node, roi)
        
        elif node.recognition == RecognitionType.FEATURE_MATCH:
            return self._feature_match(image, node, roi)
        
        elif node.recognition == RecognitionType.COLOR_MATCH:
            return self._color_match(image, node, roi)
        
        else:
            return RecoResult(algorithm="Unknown")
    
    def _template_match(
        self, 
        image: np.ndarray, 
        node: PipelineNode,
        roi: Optional[Rect]
    ) -> RecoResult:
        """模板匹配 (支持多尺度)"""
        param = node.recognition_param
        
        # 处理模板路径
        templates = param.get('template', [])
        if isinstance(templates, str):
            templates = [templates]
        
        # 如果设置了资源目录，补全路径
        if self._resource_dir:
            templates = [
                str(self._resource_dir / t) if not Path(t).is_absolute() else t
                for t in templates
            ]
        
        # 验证模板文件是否存在
        for t in templates:
            if not Path(t).exists():
                self._log(f"警告: 模板文件不存在: {t}")
        
        # 处理阈值
        thresholds = param.get('threshold', [0.7])
        if isinstance(thresholds, (int, float)):
            thresholds = [thresholds]
        
        matcher_param = TemplateMatcherParam(
            templates=templates,
            thresholds=thresholds,
            method=param.get('method', 5),
            green_mask=param.get('green_mask', False),
            multi_scale=param.get('multi_scale', True),
            scale_range=param.get('scale_range', [0.5, 1.5]),
            scale_step=param.get('scale_step', 0.1),
        )
        
        matcher = TemplateMatcher(image, matcher_param, roi, name=node.name)
        return matcher.analyze()
    
    def _feature_match(
        self,
        image: np.ndarray,
        node: PipelineNode,
        roi: Optional[Rect]
    ) -> RecoResult:
        """特征匹配 (抗透视/旋转)"""
        param = node.recognition_param
        
        # 处理模板路径
        templates = param.get('template', [])
        if isinstance(templates, str):
            templates = [templates]
        
        # 如果设置了资源目录，补全路径
        if self._resource_dir:
            templates = [
                str(self._resource_dir / t) if not Path(t).is_absolute() else t
                for t in templates
            ]
        
        # 验证模板文件是否存在
        for t in templates:
            if not Path(t).exists():
                self._log(f"警告: 模板文件不存在: {t}")
        
        # 解析检测器类型
        detector_str = param.get('detector', 'AKAZE')
        detector_map = {
            'SIFT': FeatureDetector.SIFT,
            'ORB': FeatureDetector.ORB,
            'BRISK': FeatureDetector.BRISK,
            'KAZE': FeatureDetector.KAZE,
            'AKAZE': FeatureDetector.AKAZE,
        }
        detector = detector_map.get(detector_str.upper(), FeatureDetector.AKAZE)
        
        matcher_param = FeatureMatcherParam(
            templates=templates,
            detector=detector,
            ratio=param.get('ratio', 0.75),
            count=param.get('count', 10),
            green_mask=param.get('green_mask', False),
        )
        
        matcher = FeatureMatcher(image, matcher_param, roi, name=node.name)
        return matcher.analyze()
    
    def _color_match(
        self,
        image: np.ndarray,
        node: PipelineNode,
        roi: Optional[Rect]
    ) -> RecoResult:
        """颜色匹配"""
        param = node.recognition_param
        
        lower = param.get('lower', [])
        upper = param.get('upper', [])
        
        # 支持多组颜色范围
        if lower and isinstance(lower[0], int):
            ranges = [(lower, upper)]
        else:
            ranges = list(zip(lower, upper))
        
        matcher_param = ColorMatcherParam(
            ranges=ranges,
            method=param.get('method', 4),
            count=param.get('count', 1),
            connected=param.get('connected', False),
        )
        
        matcher = ColorMatcher(image, matcher_param, roi, name=node.name)
        return matcher.analyze()
    
    def _execute_action(self, node: PipelineNode, reco_result: RecoResult):
        """执行动作"""
        if node.action == ActionType.DO_NOTHING:
            return
        
        param = node.action_param
        
        if node.action == ActionType.CLICK:
            self._action_click(reco_result, param)
        elif node.action == ActionType.LONG_PRESS:
            self._action_long_press(reco_result, param)
        elif node.action == ActionType.SWIPE:
            self._action_swipe(reco_result, param)
        elif node.action == ActionType.INPUT_TEXT:
            self._action_input_text(param)
        elif node.action == ActionType.WAIT:
            self._action_wait(param)
    
    def _get_click_point(
        self, 
        reco_result: RecoResult, 
        param: Dict[str, Any]
    ) -> Point:
        """获取点击点"""
        target = param.get('target', True)
        offset = param.get('target_offset', [0, 0, 0, 0])
        
        if target is True and reco_result.box:
            # 点击识别到的位置
            center = reco_result.box.center()
            return Point(
                x=center.x + offset[0],
                y=center.y + offset[1]
            )
        elif isinstance(target, list) and len(target) >= 2:
            # 固定坐标
            return Point(
                x=target[0] + offset[0],
                y=target[1] + offset[1]
            )
        else:
            # 默认屏幕中心
            return Point(x=960 + offset[0], y=540 + offset[1])
    
    def _action_click(self, reco_result: RecoResult, param: Dict[str, Any]):
        """点击动作"""
        point = self._get_click_point(reco_result, param)
        self._log(f"点击: ({point.x}, {point.y})")
        pyautogui.click(point.x, point.y)
    
    def _action_long_press(self, reco_result: RecoResult, param: Dict[str, Any]):
        """长按动作"""
        point = self._get_click_point(reco_result, param)
        duration = param.get('duration', 1000) / 1000
        self._log(f"长按: ({point.x}, {point.y}), {duration}s")
        pyautogui.mouseDown(point.x, point.y)
        time.sleep(duration)
        pyautogui.mouseUp()
    
    def _action_swipe(self, reco_result: RecoResult, param: Dict[str, Any]):
        """滑动动作"""
        # 起点
        begin = param.get('begin', True)
        if begin is True and reco_result.box:
            start = reco_result.box.center()
        elif isinstance(begin, list):
            start = Point(x=begin[0], y=begin[1])
        else:
            start = Point(x=960, y=540)
        
        # 终点
        end = param.get('end', [0, 0])
        end_point = Point(x=end[0], y=end[1])
        
        duration = param.get('duration', 200) / 1000
        
        self._log(f"滑动: ({start.x}, {start.y}) -> ({end_point.x}, {end_point.y})")
        pyautogui.moveTo(start.x, start.y)
        pyautogui.drag(
            end_point.x - start.x, 
            end_point.y - start.y, 
            duration=duration
        )
    
    def _action_input_text(self, param: Dict[str, Any]):
        """输入文本"""
        text = param.get('input_text', '')
        self._log(f"输入: {text}")
        pyautogui.write(text)
    
    def _action_wait(self, param: Dict[str, Any]):
        """等待"""
        duration = param.get('duration', 1000) / 1000
        self._log(f"等待: {duration}s")
        time.sleep(duration)
    
    def _find_next_node(self, node: PipelineNode) -> Optional[str]:
        """查找下一个可执行的节点"""
        for next_name in node.next:
            next_node = self._nodes.get(next_name)
            if next_node and next_node.enabled:
                return next_name
        return None

