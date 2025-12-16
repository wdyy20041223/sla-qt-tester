# 静态代码分析功能

## 功能概述

本项目集成了 cppcheck 静态代码分析工具，用于检查 Qt C++ 项目中的潜在问题。

## 特性

- **自动检测和安装**：首次使用时自动检测系统中是否已安装 cppcheck，如未安装则提供一键安装功能
- **项目级分析**：对整个 Qt 项目进行全面的静态代码分析
- **问题分类**：将发现的问题按严重程度分为错误和警告
- **详细信息**：提供每个问题的详细说明和代码位置
- **友好界面**：直观的 UI 显示分析结果和统计信息

## 使用方法

### 1. 启动应用并选择项目

在主界面左侧选择要分析的 Qt 项目。

### 2. 进入静态分析页面

点击顶部标签栏的 **🔍 静态分析** 按钮。

### 3. 检查 cppcheck 状态

- 应用会自动检查 cppcheck 是否已安装
- 如果已安装，会显示绿色指示灯和版本信息
- 如果未安装，会显示红色指示灯和 "未安装" 状态

### 4. 安装 cppcheck（如需要）

如果 cppcheck 未安装：

1. 点击 **安装 Cppcheck** 按钮
2. 等待自动下载和安装完成
3. 安装完成后会自动刷新状态

**注意**：
- **Windows**：会下载便携版 cppcheck 到项目的 `tools/cppcheck/` 目录
- **Linux**：使用 `apt` 或 `yum` 包管理器安装到系统
- **macOS**：使用 `brew` 安装到系统

### 5. 运行分析

1. 点击 **运行分析** 按钮
2. 等待分析完成（可能需要几秒到几分钟，取决于项目大小）
3. 查看分析结果

### 6. 查看结果

分析完成后界面会显示：

- **统计信息**：检查的文件数、错误数、警告数
- **问题列表**：
  - 错误列表（严重问题）
  - 警告列表（建议改进的问题）
- **问题详情**：
  - 点击任何问题查看详细信息
  - 包括问题类型、描述、代码位置等

## cppcheck 检查类型

cppcheck 会检测以下类型的问题：

- **error**：编程错误，如内存泄漏、空指针解引用
- **warning**：可能导致问题的代码
- **style**：代码风格建议
- **performance**：性能优化建议
- **portability**：跨平台兼容性问题
- **information**：信息性提示

## 技术架构

### 后端模块

1. **`core/qt_project/cppcheck_manager.py`**
   - 检测系统和本地 cppcheck
   - 自动下载和安装 cppcheck
   - 管理 cppcheck 版本信息

2. **`core/qt_project/static_analyzer.py`**
   - 执行 cppcheck 分析
   - 解析 XML 输出结果
   - 提供项目和文件级别的分析

3. **`backend/static_analysis_api.py`**
   - 暴露给前端的 API 接口
   - 包装核心功能模块

### 前端模块

1. **`frontend/src/api/static-analysis.ts`**
   - TypeScript 类型定义
   - Python API 调用封装

2. **`frontend/src/components/StaticAnalysisPanel.tsx`**
   - 静态分析 UI 组件
   - 交互逻辑和状态管理

## 配置选项

可以通过修改 `StaticAnalyzer` 类来自定义分析行为：

```python
# 在 core/qt_project/static_analyzer.py 中

# 启用特定检查
enable_checks = ["all", "style", "performance"]

# 设置严重程度过滤
severity = "warning"  # error, warning, style, performance, portability, information

# 添加额外的头文件搜索路径
include_paths = ["/path/to/includes"]
```

## 故障排除

### cppcheck 安装失败

**Windows**：
- 检查网络连接
- 手动下载 cppcheck 并解压到 `tools/cppcheck/` 目录
- 确保 `cppcheck.exe` 存在

**Linux/macOS**：
- 检查包管理器权限（可能需要 sudo）
- 手动安装：
  - Linux: `sudo apt install cppcheck` 或 `sudo yum install cppcheck`
  - macOS: `brew install cppcheck`

### 分析超时

- 大型项目可能需要较长时间
- 默认超时时间为 5 分钟
- 可在 `static_analyzer.py` 中调整 `timeout` 参数

### 未找到源文件

- 确保项目目录包含 `.cpp` 和 `.h` 文件
- 检查项目路径是否正确

## 最佳实践

1. **定期运行**：在每次重大代码变更后运行静态分析
2. **优先修复错误**：先修复 error 级别的问题，再处理 warning
3. **代码审查**：将静态分析结果纳入代码审查流程
4. **持续改进**：根据项目特点调整检查规则

## 相关资源

- [Cppcheck 官方文档](http://cppcheck.sourceforge.net/)
- [Cppcheck GitHub](https://github.com/danmar/cppcheck)
