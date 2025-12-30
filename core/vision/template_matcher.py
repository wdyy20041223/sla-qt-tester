"""
模板匹配器 - 找图功能

"""

import time
from dataclasses import dataclass, field
from typing import List, Optional, Union
from pathlib import Path
import numpy as np

try:
    import cv2
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False

from .types import Rect, RecoResult, MatchResult, OrderBy
from .base import VisionBase


@dataclass
class TemplateMatcherParam:
    """模板匹配参数
    
    参考 MAA 的 TemplateMatcherParam
    """
    # 模板图片路径或numpy数组
    templates: List[Union[str, np.ndarray]] = field(default_factory=list)
    
    # 匹配阈值 (0-1)，可以为每个模板设置不同阈值
    thresholds: List[float] = field(default_factory=lambda: [0.7])
    
    # 匹配算法 (cv2.TM_CCOEFF_NORMED = 5)
    method: int = 5
    
    # 绿色掩码（将模板中绿色部分排除匹配）
    green_mask: bool = False
    
    # 结果排序方式
    order_by: OrderBy = OrderBy.HORIZONTAL
    
    # 返回第几个结果（支持负数索引）
    result_index: int = 0
    
    # ===== 多尺度匹配参数 =====
    # 是否启用多尺度匹配
    multi_scale: bool = True
    
    # 缩放范围 [min_scale, max_scale]
    scale_range: List[float] = field(default_factory=lambda: [0.5, 1.5])
    
    # 缩放步长
    scale_step: float = 0.1


class TemplateMatcher(VisionBase):
    """模板匹配器
    
    使用 OpenCV 模板匹配算法在图像中查找模板
    
    示例:
        >>> param = TemplateMatcherParam(
        ...     templates=["button.png"],
        ...     thresholds=[0.8]
        ... )
        >>> matcher = TemplateMatcher(screen_image, param=param)
        >>> result = matcher.analyze()
        >>> if result.success:
        ...     print(f"找到目标: {result.box}")
    """
    
    # 反转分数基数（用于 TM_SQDIFF 系列方法）
    METHOD_INVERT_BASE = 10000
    
    def __init__(
        self,
        image: np.ndarray,
        param: TemplateMatcherParam,
        roi: Optional[Rect] = None,
        name: str = "TemplateMatcher"
    ):
        super().__init__(image, roi, name)
        self._param = param
        self._templates: List[np.ndarray] = []
        self._low_score_better = param.method in (
            cv2.TM_SQDIFF, 
            cv2.TM_SQDIFF_NORMED
        )
        
        # 加载模板
        self._load_templates()
    
    def _load_templates(self):
        """加载模板图片"""
        for tmpl in self._param.templates:
            if isinstance(tmpl, str):
                # 从文件加载
                path = Path(tmpl)
                if path.exists():
                    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
                    if img is not None:
                        self._templates.append(img)
                        print(f"[TemplateMatcher] 模板加载成功: {path} ({img.shape[1]}x{img.shape[0]})")
                    else:
                        print(f"[TemplateMatcher] 模板加载失败 (无法读取): {path}")
                else:
                    print(f"[TemplateMatcher] 模板文件不存在: {path}")
            elif isinstance(tmpl, np.ndarray):
                self._templates.append(tmpl)
                print(f"[TemplateMatcher] 使用内存模板: {tmpl.shape[1]}x{tmpl.shape[0]}")
    
    def analyze(self) -> RecoResult:
        """执行模板匹配分析"""
        start_time = time.perf_counter()
        
        result = RecoResult(algorithm="TemplateMatch")
        
        if not self._templates:
            print(f"[TemplateMatcher] 警告: 没有加载任何模板!")
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        
        all_results: List[MatchResult] = []
        filtered_results: List[MatchResult] = []
        
        # 对每个模板执行匹配
        for i, template in enumerate(self._templates):
            threshold = self._get_threshold(i)
            matches = self._template_match(template)
            
            # 调试: 输出匹配结果
            if matches:
                best_match = max(matches, key=lambda m: m.score) if not self._low_score_better else min(matches, key=lambda m: m.score)
                print(f"[TemplateMatcher] 模板 {i}: 最佳分数={best_match.score:.4f}, 阈值={threshold}, 位置=({best_match.box.x}, {best_match.box.y})")
            
            # 添加到全部结果
            all_results.extend(matches)
            
            # 过滤符合阈值的结果
            for match in matches:
                if self._check_threshold(match.score, threshold):
                    filtered_results.append(match)
        
        # NMS 去重
        filtered_results = self.nms(filtered_results, iou_threshold=0.5)
        
        # 排序
        all_results = self.sort_results(all_results, self._param.order_by)
        filtered_results = self.sort_results(filtered_results, self._param.order_by)
        
        # 选择最佳结果
        if filtered_results:
            idx = self.pythonic_index(len(filtered_results), self._param.result_index)
            if idx is not None:
                result.best_result = filtered_results[idx]
        
        result.all_results = all_results
        result.filtered_results = filtered_results
        result.cost_ms = (time.perf_counter() - start_time) * 1000
        
        # 输出匹配结果摘要
        print(f"[TemplateMatcher] 匹配完成: 全部={len(all_results)}, 过滤后={len(filtered_results)}, 成功={result.success}, 耗时={result.cost_ms:.1f}ms")
        if result.best_result:
            print(f"[TemplateMatcher] 最终结果: 分数={result.score:.4f}, 位置=({result.box.x}, {result.box.y}, {result.box.width}x{result.box.height})")
        
        # 调试绘图
        if self._debug_draw and result.best_result:
            result.debug_image = self._draw_result(filtered_results)
        
        return result
    
    def _template_match(self, template: np.ndarray) -> List[MatchResult]:
        """执行单个模板的匹配 (优化版本 - 参考 MAA 框架)
        
        支持多尺度匹配: 当启用 multi_scale 时，会在不同缩放比例下进行匹配
        """
        image_roi = self.image_with_roi()
        
        # 处理匹配方法
        method = self._param.method
        invert_score = False
        if method >= self.METHOD_INVERT_BASE:
            invert_score = True
            method -= self.METHOD_INVERT_BASE
        
        all_results: List[MatchResult] = []
        
        # ===== 多尺度匹配 =====
        if self._param.multi_scale:
            scales = np.arange(
                self._param.scale_range[0],
                self._param.scale_range[1] + self._param.scale_step,
                self._param.scale_step
            )
        else:
            scales = [1.0]
        
        best_overall_score = 0.0 if not self._low_score_better else float('inf')
        best_overall_result = None
        
        for scale in scales:
            # 缩放模板
            if scale != 1.0:
                new_w = max(1, int(template.shape[1] * scale))
                new_h = max(1, int(template.shape[0] * scale))
                scaled_template = cv2.resize(template, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            else:
                scaled_template = template
            
            h, w = scaled_template.shape[:2]
            
            # 检查尺寸
            if h > image_roi.shape[0] or w > image_roi.shape[1]:
                continue
            
            # 创建掩码（可选）
            mask = self._create_mask(scaled_template) if self._param.green_mask else None
            
            # 执行模板匹配
            if mask is not None:
                matched = cv2.matchTemplate(image_roi, scaled_template, method, mask=mask)
            else:
                matched = cv2.matchTemplate(image_roi, scaled_template, method)
            
            # 反转分数
            if invert_score:
                matched = 1.0 - matched
            
            # 使用 minMaxLoc 找最佳匹配点
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(matched)
            
            if self._low_score_better:
                best_score = float(min_val)
                best_loc = min_loc
            else:
                best_score = float(max_val)
                best_loc = max_loc
            
            # 处理无效分数
            if np.isnan(best_score) or np.isinf(best_score):
                continue
            
            # 更新最佳结果
            is_better = (not self._low_score_better and best_score > best_overall_score) or \
                        (self._low_score_better and best_score < best_overall_score)
            
            if is_better:
                best_overall_score = best_score
                best_overall_result = MatchResult(
                    box=Rect(
                        x=best_loc[0] + self._roi.x,
                        y=best_loc[1] + self._roi.y,
                        width=w,
                        height=h
                    ),
                    score=best_score
                )
            
            # 提取当前尺度的候选点
            pre_filter_threshold = 0.5
            if self._low_score_better:
                candidate_mask = matched < pre_filter_threshold
            else:
                candidate_mask = matched >= pre_filter_threshold
            
            candidate_coords = np.argwhere(candidate_mask)
            
            # 限制候选点数量
            MAX_CANDIDATES = 50
            if len(candidate_coords) > MAX_CANDIDATES:
                scores = matched[candidate_mask]
                if self._low_score_better:
                    top_indices = np.argsort(scores)[:MAX_CANDIDATES]
                else:
                    top_indices = np.argsort(scores)[-MAX_CANDIDATES:][::-1]
                candidate_coords = candidate_coords[top_indices]
            
            for row, col in candidate_coords:
                score = float(matched[row, col])
                if np.isnan(score) or np.isinf(score):
                    continue
                
                box = Rect(
                    x=col + self._roi.x,
                    y=row + self._roi.y,
                    width=w,
                    height=h
                )
                all_results.append(MatchResult(box=box, score=score))
        
        # 确保至少有一个结果 (参考 MAA: At least there is a result)
        if not all_results and best_overall_result:
            all_results.append(best_overall_result)
        elif not all_results:
            # 即使失败也返回一个占位结果
            h, w = template.shape[:2]
            all_results.append(MatchResult(
                box=Rect(x=self._roi.x, y=self._roi.y, width=w, height=h),
                score=0.0
            ))
        
        # NMS 去重 (参考 MAA 的 0.7 阈值)
        all_results = self.nms(all_results, iou_threshold=0.7)
        
        return all_results
    
    def _create_mask(self, template: np.ndarray) -> Optional[np.ndarray]:
        """创建绿色掩码
        
        将模板中纯绿色 RGB(0, 255, 0) 的区域设为掩码（不参与匹配）
        """
        if template.shape[2] < 3:
            return None
        
        # BGR 格式中绿色是 (0, 255, 0)
        green_lower = np.array([0, 250, 0])
        green_upper = np.array([10, 255, 10])
        
        # 找到绿色区域
        green_mask = cv2.inRange(template, green_lower, green_upper)
        
        # 反转（绿色区域为0，其他为255）
        mask = cv2.bitwise_not(green_mask)
        
        return mask
    
    def _get_threshold(self, index: int) -> float:
        """获取指定索引的阈值"""
        if index < len(self._param.thresholds):
            return self._param.thresholds[index]
        return self._param.thresholds[-1] if self._param.thresholds else 0.7
    
    def _check_threshold(self, score: float, threshold: float) -> bool:
        """检查分数是否满足阈值"""
        if self._low_score_better:
            return score <= threshold
        else:
            return score >= threshold
    
    def _draw_result(self, results: List[MatchResult]) -> np.ndarray:
        """绘制匹配结果（调试用）"""
        image_draw = self.draw_roi()
        color = (0, 0, 255)  # 红色
        
        for i, res in enumerate(results):
            # 绘制矩形框
            cv2.rectangle(
                image_draw,
                (res.box.x, res.box.y),
                (res.box.x + res.box.width, res.box.y + res.box.height),
                color, 
                2
            )
            
            # 绘制标签
            label = f"{i}: {res.score:.3f}"
            cv2.putText(
                image_draw, 
                label,
                (res.box.x, res.box.y - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1
            )
        
        return image_draw


def find_template(
    image: np.ndarray,
    template: Union[str, np.ndarray],
    threshold: float = 0.7,
    roi: Optional[Rect] = None,
    method: int = cv2.TM_CCOEFF_NORMED
) -> RecoResult:
    """便捷函数：在图像中查找模板
    
    Args:
        image: 搜索图像
        template: 模板图片路径或numpy数组
        threshold: 匹配阈值
        roi: 搜索区域
        method: 匹配算法
        
    Returns:
        识别结果
    """
    param = TemplateMatcherParam(
        templates=[template],
        thresholds=[threshold],
        method=method
    )
    matcher = TemplateMatcher(image, param, roi)
    return matcher.analyze()

