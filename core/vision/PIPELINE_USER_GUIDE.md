# 视觉测试 Pipeline 用户指南

本文档介绍如何使用 JSON 配置文件创建自定义的视觉测试流水线。

## 目录

- [基本结构](#基本结构)
- [识别类型](#识别类型)
- [动作类型](#动作类型)
- [通用参数](#通用参数)
- [图形节点词汇对照表](#图形节点词汇对照表)
- [最佳实践](#最佳实践)
- [完整示例](#完整示例)

---

## 基本结构

每个 Pipeline 是一个 JSON 文件，包含多个节点。每个节点定义一个"识别 + 动作"的组合。

```json
{
    "$comment": "可选的注释说明",
    "$description": "可选的描述",
    "$resource_base": "../resources/freecharts",
    
    "节点名称": {
        "recognition": "识别类型",
        "action": "动作类型",
        "next": ["下一个节点"]
    }
}
```

**特殊字段**：
- `$comment`, `$description`, `$resource_base` 等以 `$` 开头的字段会被忽略，用于注释
- `$resource_base` 指定模板图片的相对路径基准

---

## 识别类型

### 1. DirectHit - 直接命中

不执行任何图像识别，直接成功。适用于固定坐标点击或流程控制。

```json
{
    "开始": {
        "recognition": "DirectHit",
        "action": "Click",
        "target": [500, 300],
        "next": ["下一步"]
    }
}
```

### 2. TemplateMatch - 模板匹配 ⭐推荐

在屏幕上查找与模板图片相似的区域。

```json
{
    "找图标": {
        "recognition": "TemplateMatch",
        "template": ["icons/button.png"],
        "threshold": [0.2],
        "roi": [0, 100, 220, 700],
        "multi_scale": false,
        "action": "Click",
        "target": true,
        "next": ["下一步"]
    }
}
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `template` | string[] | 必填 | 模板图片路径列表 |
| `threshold` | number[] | [0.2] | 匹配阈值 (0-1)，**越低越宽松** |
| `roi` | [x,y,w,h] | 全屏 | 搜索区域 |
| `multi_scale` | bool | true | 是否启用多尺度匹配 |
| `scale_range` | [min,max] | [0.5,1.5] | 缩放范围 |
| `scale_step` | number | 0.1 | 缩放步长 |
| `method` | int | 5 | OpenCV匹配方法 (5=TM_CCOEFF_NORMED) |
| `green_mask` | bool | false | 绿色掩码（排除绿色区域） |
| `order_by` | string | "Score" | 结果排序: Score/Horizontal/Vertical |

**⚠️ 重要提示**：
- **模板尺寸必须与目标一致**！如果模板太大，需要预先缩放
- 推荐关闭 `multi_scale`，使用正确尺寸的模板
- 阈值建议从 0.2 开始调试，0.2是一个表现很好的数值，不建议超过0.3

### 3. FeatureMatch - 特征匹配

基于特征点匹配，对旋转和透视变换更鲁棒。适用于复杂场景。

```json
{
    "特征匹配": {
        "recognition": "FeatureMatch",
        "template": ["complex_icon.png"],
        "detector": "AKAZE",
        "ratio": 0.75,
        "count": 10,
        "roi": [0, 0, 1920, 1080],
        "action": "Click",
        "target": true
    }
}
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `template` | string[] | 必填 | 模板图片路径 |
| `detector` | string | "AKAZE" | 检测器: SIFT/ORB/BRISK/KAZE/AKAZE |
| `ratio` | number | 0.75 | Lowe's ratio test 阈值 |
| `count` | int | 10 | 最少匹配点数 |
| `green_mask` | bool | false | 绿色掩码 |

**注意**：简单线条图形（本项目，即流程图编辑器）特征点少，不适合用特征匹配。

### 4. ColorMatch - 颜色匹配

在指定颜色范围内查找区域。

```json
{
    "找红色按钮": {
        "recognition": "ColorMatch",
        "lower": [0, 100, 100],
        "upper": [10, 255, 255],
        "roi": [0, 0, 500, 500],
        "count": 1,
        "connected": true,
        "action": "Click",
        "target": true
    }
}
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lower` | [H,S,V] | 必填 | HSV颜色下界 |
| `upper` | [H,S,V] | 必填 | HSV颜色上界 |
| `count` | int | 1 | 最少匹配像素数 |
| `connected` | bool | false | 是否只返回连通区域 |

---

## 动作类型

### 1. DoNothing - 不执行动作

```json
{
    "等待出现": {
        "recognition": "TemplateMatch",
        "template": ["loading.png"],
        "action": "DoNothing",
        "next": ["继续"]
    }
}
```

### 2. Click - 点击

```json
{
    "点击按钮": {
        "recognition": "TemplateMatch",
        "template": ["button.png"],
        "action": "Click",
        "target": true,
        "target_offset": [0, 0, 0, 0]
    }
}
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `target` | bool/[x,y] | true | true=点击识别位置，[x,y]=固定坐标 |
| `target_offset` | [x,y,0,0] | [0,0,0,0] | 点击偏移量 |

### 3. LongPress - 长按

```json
{
    "长按图标": {
        "action": "LongPress",
        "target": [500, 300],
        "duration": 2000
    }
}
```

### 4. Swipe - 滑动

```json
{
    "向下滑动": {
        "recognition": "DirectHit",
        "action": "Swipe",
        "begin": [500, 600],
        "end": [500, 200],
        "duration": 300
    }
}
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `begin` | bool/[x,y] | true | 起点，true=识别位置 |
| `end` | [x,y] | 必填 | 终点坐标 |
| `duration` | int | 200 | 滑动时长(ms) |

### 5. InputText - 输入文本

```json
{
    "输入用户名": {
        "recognition": "DirectHit",
        "action": "InputText",
        "input_text": "admin"
    }
}
```

### 6. Wait - 等待

```json
{
    "等待加载": {
        "recognition": "DirectHit",
        "action": "Wait",
        "duration": 2000
    }
}
```

---

## 通用参数

这些参数可用于任何节点：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `roi` | [x,y,w,h] | null | 识别区域，null=全屏 |
| `next` | string[] | [] | 后续节点列表 |
| `timeout` | int | 20000 | 超时时间(ms) |
| `rate_limit` | int | 1000 | 识别频率限制(ms) |
| `pre_delay` | int | 200 | 动作前延迟(ms) |
| `post_delay` | int | 200 | 动作后延迟(ms) |
| `inverse` | bool | false | 反转识别结果 |
| `enabled` | bool | true | 是否启用该节点 |

---

## 图形节点词汇对照表

在进行视觉测试时，用户可能使用不同的描述词来指代同一个图形节点。以下是常用描述词与实际图片文件名的对照关系：

### 流程图节点对照

| 用户描述词 | 图片文件名 | 说明 |
|-----------|-----------|------|
| **菱形**、**判断**、**条件**、**分支** | `Conditional_fix.png` | 条件判断节点，菱形形状 |
| **方形**、**矩形**、**卡片**、**处理** | `card_fix.png` | 处理步骤节点，矩形卡片形状 |
| **圆形**、**圆** | `Circular_fix.png` | 圆形节点 |
| **磁盘**、**数据库**、**存储** | `disk_fix.png` | 数据存储节点，圆柱形状 |
| **输入输出**、**IO**、**数据** | `IO_fix.png` | 输入输出节点，平行四边形 |
| **开始结束**、**起止**、**椭圆** | `startend_fix.png` | 开始/结束节点，椭圆形状 |
| **步骤**、**流程** | `step_fix.png` | 流程步骤节点 |

### 使用示例

```json
{
    "$comment": "用户说'点击菱形工具'时，实际指向 Conditional_fix.png",
    "选择判断工具": {
        "recognition": "TemplateMatch",
        "template": ["NodesIcon/final/Conditional_fix.png"],
        "threshold": [0.2],
        "roi": [0, 100, 220, 700],
        "multi_scale": false,
        "action": "Click",
        "target": true,
        "next": ["在画布放置"]
    }
}
```

**重要提示**：
- 在编写 Pipeline 时，请使用准确的文件名，如 `Conditional_fix.png`
- 上述词汇对照表帮助理解用户意图，但配置文件中必须使用实际的 `.png` 文件名
- 所有图片文件都位于 `core/vision/resources/freecharts/NodesIcon/final/` 目录下

---

## 最佳实践

### 1. 模板图片准备

```
✅ 正确做法：
- 从实际界面截取模板，保证尺寸一致
- 使用白色/纯色背景（避免透明底）
- 模板包含足够的特征（避免纯色块）

❌ 错误做法：
- 使用与目标尺寸不同的模板
- 使用透明底PNG
- 依赖多尺度匹配来适配尺寸
```

### 2. 阈值调试

```
模板匹配阈值建议：
- 0.1: 非常宽松，可能误匹配
- 0.2: 中等，适合大多数场景
- 0.3: 严格，要求高相似度
- 0.3+: 非常严格
```

### 3. ROI 设置

```json
// 工具箱区域，可能需要根据不同电脑屏幕大小微调，一般推荐调用工具时，准确识别工具箱而不是全屏
"roi": [0, 100, 220, 700]

// 画布区域，可能需要根据不同电脑屏幕大小微调
"roi": [220, 100, 1200, 800]

// 全屏（默认），可能需要根据不同电脑屏幕大小微调
"roi": null
```

### 4. 流程设计

```
节点命名清晰：
✅ "点击保存按钮" 
❌ "step1"

合理使用延迟：
- pre_delay: 等待界面稳定
- post_delay: 等待操作生效
```

---

## 完整示例

```json
{
    "$comment": "FreeCharts 自动化测试示例 - 展示词汇对照表的实际使用",
    "$resource_base": "../resources/freecharts",
    
    "开始测试": {
        "recognition": "DirectHit",
        "action": "DoNothing",
        "pre_delay": 1500,
        "next": ["选择菱形工具"]
    },
    
    "选择菱形工具": {
        "$comment": "用户说'菱形'或'判断'时，对应 Conditional_fix.png",
        "recognition": "TemplateMatch",
        "template": ["NodesIcon/final/Conditional_fix.png"],
        "threshold": [0.2],
        "roi": [0, 100, 220, 700],
        "multi_scale": false,
        "action": "Click",
        "target": true,
        "pre_delay": 300,
        "post_delay": 500,
        "next": ["在画布放置菱形"]
    },
    
    "在画布放置菱形": {
        "recognition": "DirectHit",
        "action": "Click",
        "target": [600, 300],
        "pre_delay": 200,
        "post_delay": 500,
        "next": ["选择矩形工具"]
    },
    
    "选择矩形工具": {
        "$comment": "用户说'方形'、'矩形'或'卡片'时，对应 card_fix.png",
        "recognition": "TemplateMatch",
        "template": ["NodesIcon/final/card_fix.png"],
        "threshold": [0.2],
        "roi": [0, 100, 220, 700],
        "multi_scale": false,
        "action": "Click",
        "target": true,
        "pre_delay": 300,
        "post_delay": 500,
        "next": ["在画布放置矩形"]
    },
    
    "在画布放置矩形": {
        "recognition": "DirectHit",
        "action": "Click",
        "target": [800, 400],
        "pre_delay": 200,
        "post_delay": 500,
        "next": ["测试完成"]
    },
    
    "测试完成": {
        "recognition": "DirectHit",
        "action": "DoNothing",
        "next": []
    }
}
```

---

## 文件组织建议

```
core/vision/
├── examples/           # Pipeline JSON 文件
│   ├── demo_pipeline.json
│   └── my_test.json
├── resources/          # 模板图片
│   └── freecharts/
│       ├── NodesIcon/
│       │   └── final/  # 处理好的模板（推荐）
│       └── logo.png
└── PIPELINE_USER_GUIDE.md  # 本文档
```

---

## 常见问题

**Q: 识别总是失败？**
- 检查模板尺寸是否与目标一致
- 降低 threshold 值
- 确认 ROI 范围包含目标

**Q: 识别到错误位置？**
- 关闭 multi_scale
- 使用正确尺寸的模板
- 设置 order_by: "Score"

**Q: 特征匹配失败？**
- 简单几何图形不适合特征匹配
- 改用 TemplateMatch

---

*文档版本: 1.0 | 更新日期: 2025-12-30*

