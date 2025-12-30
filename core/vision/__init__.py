"""
视觉识别模块

提供以下识别能力:
- TemplateMatcher: 模板匹配（找图）- 支持多尺度匹配
- FeatureMatcher: 特征匹配（抗透视/旋转）
- ColorMatcher: 颜色匹配（找色）
- Pipeline: 任务流水线

设计原则:
- 统一的识别结果接口 (RecoResult)
- 支持 ROI 区域限定
- 支持多结果排序和筛选
- JSON 配置驱动的 Pipeline
- 参考 MAA 框架设计
"""

from .types import (
    RecoResult,
    MatchResult,
    Rect,
    Point,
    Target,
    TargetType,
    OrderBy,
)
from .base import VisionBase
from .template_matcher import TemplateMatcher, TemplateMatcherParam
from .feature_matcher import FeatureMatcher, FeatureMatcherParam, FeatureDetector
from .color_matcher import ColorMatcher, ColorMatcherParam
from .pipeline import Pipeline, PipelineNode

__all__ = [
    # Types
    'RecoResult',
    'MatchResult', 
    'Rect',
    'Point',
    'Target',
    'TargetType',
    'OrderBy',
    # Base
    'VisionBase',
    # Matchers
    'TemplateMatcher',
    'TemplateMatcherParam',
    'FeatureMatcher',
    'FeatureMatcherParam',
    'FeatureDetector',
    'ColorMatcher', 
    'ColorMatcherParam',
    # Pipeline
    'Pipeline',
    'PipelineNode',
]

