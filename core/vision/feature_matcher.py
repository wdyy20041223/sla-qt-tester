"""
特征匹配器 - 基于特征点的图像匹配

参考 MAA 框架的 FeatureMatcher 实现
支持 SIFT、ORB、BRISK、KAZE、AKAZE 等特征检测器

适用场景:
- 目标有透视变换
- 目标有轻微旋转
- 模板匹配效果不佳时的备选方案
"""

import time
from dataclasses import dataclass, field
from typing import List, Optional, Union, Tuple
from pathlib import Path
from enum import Enum, auto
import numpy as np

try:
    import cv2
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False

from .types import Rect, RecoResult, MatchResult, OrderBy
from .base import VisionBase


class FeatureDetector(Enum):
    """特征检测器类型"""
    SIFT = auto()    # Scale-Invariant Feature Transform (精度高，速度慢)
    ORB = auto()     # Oriented FAST and Rotated BRIEF (速度快，精度一般)
    BRISK = auto()   # Binary Robust Invariant Scalable Keypoints
    KAZE = auto()    # 非线性尺度空间特征
    AKAZE = auto()   # Accelerated KAZE (推荐: 速度快，效果好)


@dataclass
class FeatureMatcherParam:
    """特征匹配参数
    
    参考 MAA 的 FeatureMatcherParam
    """
    # 模板图片路径或numpy数组
    templates: List[Union[str, np.ndarray]] = field(default_factory=list)
    
    # 特征检测器
    detector: FeatureDetector = FeatureDetector.AKAZE
    
    # 匹配比例阈值 (Lowe's ratio test)
    ratio: float = 0.75
    
    # 最少匹配点数
    count: int = 4
    
    # 绿色掩码
    green_mask: bool = False
    
    # 结果排序方式
    order_by: OrderBy = OrderBy.HORIZONTAL
    
    # 返回第几个结果
    result_index: int = 0


class FeatureMatcher(VisionBase):
    """特征匹配器
    
    使用特征点匹配算法在图像中查找模板，
    相比模板匹配更能应对透视变换和轻微旋转。
    
    示例:
        >>> param = FeatureMatcherParam(
        ...     templates=["button.png"],
        ...     detector=FeatureDetector.AKAZE,
        ...     count=10
        ... )
        >>> matcher = FeatureMatcher(screen_image, param=param)
        >>> result = matcher.analyze()
    """
    
    def __init__(
        self,
        image: np.ndarray,
        param: FeatureMatcherParam,
        roi: Optional[Rect] = None,
        name: str = "FeatureMatcher"
    ):
        super().__init__(image, roi, name)
        self._param = param
        self._templates: List[np.ndarray] = []
        
        # 加载模板
        self._load_templates()
    
    def _load_templates(self):
        """加载模板图片"""
        for tmpl in self._param.templates:
            if isinstance(tmpl, str):
                path = Path(tmpl)
                if path.exists():
                    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
                    if img is not None:
                        self._templates.append(img)
                        print(f"[FeatureMatcher] 模板加载成功: {path} ({img.shape[1]}x{img.shape[0]})")
                    else:
                        print(f"[FeatureMatcher] 模板加载失败: {path}")
                else:
                    print(f"[FeatureMatcher] 模板文件不存在: {path}")
            elif isinstance(tmpl, np.ndarray):
                self._templates.append(tmpl)
    
    def _create_detector(self) -> Optional[cv2.Feature2D]:
        """创建特征检测器"""
        detector_type = self._param.detector
        
        try:
            if detector_type == FeatureDetector.SIFT:
                return cv2.SIFT_create()
            elif detector_type == FeatureDetector.ORB:
                return cv2.ORB_create(nfeatures=1000)
            elif detector_type == FeatureDetector.BRISK:
                return cv2.BRISK_create()
            elif detector_type == FeatureDetector.KAZE:
                return cv2.KAZE_create()
            elif detector_type == FeatureDetector.AKAZE:
                return cv2.AKAZE_create()
        except Exception as e:
            print(f"[FeatureMatcher] 创建检测器失败: {e}")
        
        return None
    
    def _create_matcher(self) -> Optional[cv2.DescriptorMatcher]:
        """创建特征匹配器"""
        detector_type = self._param.detector
        
        # 根据检测器类型选择合适的匹配器
        if detector_type in (FeatureDetector.SIFT, FeatureDetector.KAZE):
            # 浮点描述符使用 FLANN
            index_params = dict(algorithm=1, trees=5)  # FLANN_INDEX_KDTREE
            search_params = dict(checks=50)
            return cv2.FlannBasedMatcher(index_params, search_params)
        else:
            # 二值描述符使用 BFMatcher + Hamming
            return cv2.BFMatcher(cv2.NORM_HAMMING)
    
    def _create_mask(self, image: np.ndarray) -> Optional[np.ndarray]:
        """创建绿色掩码"""
        if not self._param.green_mask:
            return None
        
        if len(image.shape) < 3 or image.shape[2] < 3:
            return None
        
        green_lower = np.array([0, 250, 0])
        green_upper = np.array([10, 255, 10])
        green_mask = cv2.inRange(image, green_lower, green_upper)
        mask = cv2.bitwise_not(green_mask)
        
        return mask
    
    def analyze(self) -> RecoResult:
        """执行特征匹配分析"""
        start_time = time.perf_counter()
        
        result = RecoResult(algorithm="FeatureMatch")
        
        if not self._templates:
            print(f"[FeatureMatcher] 警告: 没有加载任何模板!")
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        
        all_results: List[MatchResult] = []
        filtered_results: List[MatchResult] = []
        
        # 创建检测器和匹配器
        detector = self._create_detector()
        if not detector:
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        
        matcher = self._create_matcher()
        if not matcher:
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        
        # 获取搜索图像的特征
        image_roi = self.image_with_roi()
        image_mask = self._create_mask(image_roi)
        
        try:
            kp_image, desc_image = detector.detectAndCompute(image_roi, image_mask)
        except Exception as e:
            print(f"[FeatureMatcher] 图像特征提取失败: {e}")
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        
        if desc_image is None or len(kp_image) < self._param.count:
            print(f"[FeatureMatcher] 图像特征点不足: {len(kp_image) if kp_image else 0}")
            result.cost_ms = (time.perf_counter() - start_time) * 1000
            return result
        
        # 对每个模板执行匹配
        for template in self._templates:
            template_mask = self._create_mask(template)
            
            try:
                kp_template, desc_template = detector.detectAndCompute(template, template_mask)
            except Exception as e:
                print(f"[FeatureMatcher] 模板特征提取失败: {e}")
                continue
            
            if desc_template is None or len(kp_template) < 4:
                print(f"[FeatureMatcher] 模板特征点不足: {len(kp_template) if kp_template else 0}")
                continue
            
            # 执行 KNN 匹配
            try:
                matches = matcher.knnMatch(desc_template, desc_image, k=2)
            except Exception as e:
                print(f"[FeatureMatcher] 匹配失败: {e}")
                continue
            
            # Lowe's ratio test
            good_matches = []
            for m_pair in matches:
                if len(m_pair) == 2:
                    m, n = m_pair
                    if m.distance < self._param.ratio * n.distance:
                        good_matches.append(m)
            
            print(f"[FeatureMatcher] 匹配点数: {len(good_matches)}/{len(matches)}, 阈值: {self._param.count}")
            
            if len(good_matches) < self._param.count:
                continue
            
            # 使用单应性矩阵找到目标区域
            src_pts = np.float32([kp_template[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
            dst_pts = np.float32([kp_image[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
            
            try:
                H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
            except Exception as e:
                print(f"[FeatureMatcher] 单应性计算失败: {e}")
                continue
            
            if H is None:
                continue
            
            # 计算目标边界框
            h, w = template.shape[:2]
            corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
            
            try:
                transformed = cv2.perspectiveTransform(corners, H)
            except Exception as e:
                continue
            
            # 计算边界框
            x_coords = transformed[:, 0, 0]
            y_coords = transformed[:, 0, 1]
            
            x_min, x_max = int(np.min(x_coords)), int(np.max(x_coords))
            y_min, y_max = int(np.min(y_coords)), int(np.max(y_coords))
            
            # 转换为全图坐标
            box = Rect(
                x=x_min + self._roi.x,
                y=y_min + self._roi.y,
                width=x_max - x_min,
                height=y_max - y_min
            )
            
            # 使用匹配点数作为分数
            match_result = MatchResult(box=box, score=len(good_matches))
            all_results.append(match_result)
            
            if len(good_matches) >= self._param.count:
                filtered_results.append(match_result)
        
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
        
        # 输出结果
        print(f"[FeatureMatcher] 完成: 全部={len(all_results)}, 过滤后={len(filtered_results)}, 成功={result.success}, 耗时={result.cost_ms:.1f}ms")
        if result.best_result:
            print(f"[FeatureMatcher] 最佳结果: 匹配点={int(result.score)}, 位置=({result.box.x}, {result.box.y})")
        
        return result


def find_feature(
    image: np.ndarray,
    template: Union[str, np.ndarray],
    detector: FeatureDetector = FeatureDetector.AKAZE,
    count: int = 10,
    ratio: float = 0.75,
    roi: Optional[Rect] = None
) -> RecoResult:
    """便捷函数：使用特征匹配在图像中查找模板
    
    Args:
        image: 搜索图像
        template: 模板图片路径或numpy数组
        detector: 特征检测器类型
        count: 最少匹配点数
        ratio: Lowe's ratio 阈值
        roi: 搜索区域
        
    Returns:
        识别结果
    """
    param = FeatureMatcherParam(
        templates=[template],
        detector=detector,
        count=count,
        ratio=ratio
    )
    matcher = FeatureMatcher(image, param, roi)
    return matcher.analyze()

