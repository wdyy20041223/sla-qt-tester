# SLA Qt Tester 使用指南

> 完整的测试工作流程说明

## 📋 目录

1. [环境准备](#环境准备)
2. [启动应用](#启动应用)
3. [测试工作流程](#测试工作流程)
4. [功能说明](#功能说明)
5. [常见问题](#常见问题)

---

## 🔧 环境准备

### 前置要求

- **Python**: 3.10 或更高版本
- **Node.js**: 建议 18.x 或更高版本
- **pnpm**: 前端包管理器
- **uv**: Python 依赖管理工具（可选，或使用 pip）
- **Qt**: 6.x 版本（用于编译 Qt 测试项目）
- **CMake**: 3.16 或更高版本

### Windows 特别说明

在 Windows 上，需要安装：
- Visual Studio 2019/2022（带 C++ 开发工具）
- Qt 6.x for MSVC（而非 MinGW 版本）
- CMake（可通过 Qt 安装程序一起安装）

### 1️⃣ 配置 API Key

```powershell
# 1. 复制环境变量模板
copy .env.example .env

# 2. 编辑 .env 文件，填入你的 DeepSeek API Key
# DEEPSEEK_API_KEY=sk-your-api-key-here
```

获取 API Key：访问 [DeepSeek 平台](https://platform.deepseek.com/) 申请

### 2️⃣ 安装 Python 依赖

```powershell
# 使用 pip 安装（Windows）
pip install -r requirements.txt

# 或使用 uv（推荐）
uv venv
.venv\Scripts\activate
uv pip install -r requirements.txt
```

### 3️⃣ 安装前端依赖

```powershell
cd frontend
pnpm install
cd ..
```

---

## 🚀 启动应用

### 开发模式（推荐）

```powershell
python run_dev.py
```

这会：
1. 自动启动 Vite 开发服务器（端口 9033）
2. 启动 PyWebView 窗口
3. 支持热重载（修改代码自动刷新）

### 生产模式

```powershell
# 1. 先构建前端
cd frontend
pnpm build
cd ..

# 2. 启动应用
python app.py
```

---

## 🧪 测试工作流程

### 完整流程概览

```
1. 编译 Qt 测试项目
   ↓
2. 启动 SLA Qt Tester
   ↓
3. 打开/刷新项目
   ↓
4. 查看测试列表
   ↓
5. 运行测试
   ↓
6. 查看结果和 AI 分析
```

### 步骤 1：编译 Qt 测试项目

**重要**：必须先编译测试才能运行！

#### Windows 编译流程

```powershell
# 进入 Qt 项目目录
cd playground\diagramscene_ultima

# 创建 build 目录
mkdir build
cd build

# 配置 CMake（替换为你的 Qt 路径）
cmake -DCMAKE_PREFIX_PATH="C:\Qt\6.10.1\msvc2022_64" -G "Visual Studio 17 2022" -A x64 ..

# 编译
cmake --build . --config Release

# 验证测试已生成
dir tests\Release\*.exe
```

#### macOS/Linux 编译流程

```bash
cd playground/diagramscene_ultima
mkdir -p build && cd build
cmake -DCMAKE_PREFIX_PATH=/path/to/Qt/6.x.x/macos ..
cmake --build .
```

**关键点**：
- ✅ 必须在 `build` 目录中构建
- ✅ 测试可执行文件会生成在 `build/tests/` 目录
- ✅ Windows 生成在 `build/tests/Release/` 或 `build/tests/Debug/`

### 步骤 2：启动应用

```powershell
python run_dev.py
```

### 步骤 3：打开项目

在应用界面中：

1. **使用默认 playground 目录**：
   - 直接点击左侧栏中的项目名称（如 "diagramscene_ultima"）

2. **打开其他文件夹**（新功能！）：
   - 点击左侧栏顶部的 **绿色"打开文件夹"** 按钮
   - 选择包含 Qt 项目的文件夹
   - 应用会自动扫描并显示项目列表

3. **刷新项目**：
   - 编译新测试后，点击 **"刷新项目"** 按钮更新列表

### 步骤 4：查看测试列表

选择项目后：

1. 点击顶部的 **"单元测试"** 标签
2. 可以看到：
   - 测试文件列表（`test_*.cpp`）
   - 编译状态（✅ 已编译 / ❌ 未编译）
   - 可执行文件路径

### 步骤 5：运行测试

#### 运行单个测试

1. 在测试列表中找到测试文件
2. 点击 **"运行测试"** 按钮
3. 等待测试执行完成

#### 查看测试输出

测试运行后会显示：
- ✅ **通过状态**
- ❌ **失败状态**
- 📝 **标准输出**
- ⚠️ **错误输出**
- ⏱️ **执行时间**

### 步骤 6：AI 分析（失败时）

如果测试失败：

1. 点击失败测试的 **"AI 分析"** 按钮
2. DeepSeek AI 会分析：
   - 失败原因
   - 可能的修复建议
   - 代码改进方向

### 步骤 7：查看测试历史

1. 点击 **"测试历史"** 面板
2. 可以看到：
   - 所有测试运行记录
   - 通过/失败趋势
   - 历史测试输出

---

## 📚 功能说明

### 主界面布局

```
┌─────────────────────────────────────────────┐
│  [文件] [编辑] [关于]                        │
├──────────┬──────────────────────────────────┤
│          │  📊 概览  🧪 单元测试  📁 文件   │
│  项目列表 │                                  │
│          ├──────────────────────────────────┤
│ 🗂 打开   │                                  │
│ 🔄 刷新   │         主内容区域                │
│          │                                  │
│ • 项目A   │                                  │
│ • 项目B   │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### 主要标签页

1. **📊 概览**：
   - 项目统计信息
   - 文件数量（.cpp、.h、.ui 等）
   - 项目文件列表

2. **🧪 单元测试**：
   - 测试文件列表
   - 运行测试
   - 查看结果
   - AI 失败分析

3. **📁 文件预览**：
   - 浏览项目文件树
   - 查看源代码
   - 支持语法高亮

4. **📜 测试历史**：
   - 历史测试记录
   - 通过/失败统计
   - 可重新查看旧结果

---

## ❓ 常见问题

### Q1: 测试列表显示"未编译"怎么办？

**A**: 需要先编译测试：

```powershell
cd playground\你的项目名\build
cmake --build . --config Release
```

然后在应用中点击"刷新项目"。

### Q2: 找不到 Qt 路径？

**A**: 确保在 CMake 配置时指定了正确的 Qt 路径：

```powershell
# Windows
cmake -DCMAKE_PREFIX_PATH="C:\Qt\6.10.1\msvc2022_64" ..

# macOS
cmake -DCMAKE_PREFIX_PATH="/Users/你的用户名/Qt/6.10.1/macos" ..
```

### Q3: CMake 配置失败？

**A**: 检查：
- ✅ Qt 是否正确安装
- ✅ CMake 版本是否足够（≥3.16）
- ✅ 是否在 `build` 目录中运行 cmake
- ✅ Windows 是否安装了 Visual Studio

### Q4: 测试运行失败，显示找不到 Qt DLL？

**A**: Windows 需要添加 Qt bin 目录到 PATH：

```powershell
# 临时添加
$env:PATH = "C:\Qt\6.10.1\msvc2022_64\bin;$env:PATH"

# 或在系统环境变量中永久添加
```

### Q5: DeepSeek AI 分析失败？

**A**: 检查：
- ✅ `.env` 文件中的 API Key 是否正确
- ✅ 网络是否能访问 DeepSeek API
- ✅ API Key 是否有剩余额度

### Q6: 如何清理构建产物？

**A**: 删除整个 build 目录即可：

```powershell
# Windows
cd playground\你的项目名
rmdir /s /q build

# macOS/Linux
rm -rf build
```

### Q7: 端口 9033 被占用？

**A**: 修改配置文件中的端口：
- `backend/config.py` - 修改 `DEV_SERVER_PORT`
- `frontend/vite.config.ts` - 修改 `server.port`

两个文件必须保持一致！

### Q8: 如何添加新的测试文件？

**A**: 
1. 在 `playground/项目名/tests/` 目录创建 `test_*.cpp`
2. 在 `tests/CMakeLists.txt` 中添加测试配置
3. 重新编译：`cd build && cmake --build .`
4. 在应用中点击"刷新项目"

---

## 🎯 快速测试示例

完整流程演示：

```powershell
# 1. 进入项目目录
cd playground\diagramscene_ultima

# 2. 编译测试（如果已编译可跳过）
cd build
cmake --build . --config Release
cd ..\..

# 3. 启动应用
python run_dev.py

# 4. 在界面中：
#    - 选择 "diagramscene_ultima" 项目
#    - 点击 "单元测试" 标签
#    - 点击任意测试的 "运行测试" 按钮
#    - 查看结果

# 5. 如果测试失败：
#    - 点击 "AI 分析" 获取修复建议
#    - 修改代码
#    - 重新编译
#    - 再次运行测试
```

---

## 📞 获取帮助

- **GitHub Issues**: 提交 Bug 或功能请求
- **开发文档**: 查看 `AGENTS.md`
- **代码示例**: 参考 `playground/diagramscene_ultima/tests/` 中的测试文件

---

**祝测试顺利！** 🎉
