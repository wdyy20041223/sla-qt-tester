# SLA Qt Tester

> 本应用开发中！尚未完成所有功能，无法用于正式环境

⚙️ **SLA Qt Tester** - Qt 可视化测试工具

## 快速开始

### 1️⃣ 配置讯飞星火 API Key

项目使用讯飞星火 AI 进行单元测试失败分析。

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 API 配置：
```bash
SPARK_API_KEY=your_api_key_here
SPARK_BASE_URL=http://maas-api.cn-huabei-1.xf-yun.com/v1
SPARK_MODEL=xop3qwen1b7
```

3. 获取 API Key：访问 [讯飞星火平台](https://xinghuo.xfyun.cn/) 申请

**注意**：`.env` 文件已在 `.gitignore` 中，不会被提交到 Git。

### 2️⃣ 安装依赖

```bash
# 安装 Python 依赖（使用 uv）
uv venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows
uv pip install -r requirements.txt

# 安装前端依赖
cd frontend && pnpm i && cd ..
```

### 3️⃣ 启动开发

```bash
python run_dev.py
```

自动启动 Vite（端口 9033）+ PyWebView 窗口

### 4️⃣ 生产构建

```bash
cd frontend && pnpm build && cd ..
python app.py
```

## 项目结构

```
├── core/              # 核心业务逻辑（纯 Python）
├── backend/           # PyWebView + JS Bridge
├── frontend/          # Vite + React 前端
├── app.py             # 生产入口
└── run_dev.py         # 开发入口
```

## 技术栈

**前端**: Vite + React 19 + TypeScript + TailwindCSS 4  
**后端**: Python 3.10+ + PyWebView 5.0+

## 继续开发

### 添加新 API

1. `core/` 实现业务逻辑
2. `backend/api.py` 暴露方法
3. `frontend/src/api/py.ts` 添加类型
4. 前端调用

> 请注意，接口过多时要有软件工程组织，建议按功能模块分组管理，避免全部堆积在单一文件中！

### 修改配置

`backend/config.py`:
```python
WINDOW_TITLE = "My App"
WINDOW_WIDTH = 1280
DEV_SERVER_PORT = 9033  # 开发端口
```

`frontend/vite.config.ts` 中的 `server.port` 也需要保持一致。

## Qt 项目测试编译

### 编译测试项目

项目使用 CMake 构建 Qt 测试，**必须在 `build` 目录中构建**：

```bash
# 进入 Qt 项目目录
cd playground/diagramscene_ultima

# 创建并进入 build 目录
mkdir -p build && cd build

# 配置 CMake（指定 Qt 路径）
cmake -DCMAKE_PREFIX_PATH=/Users/用户名/Qt/6.x.x/macos ..

# 编译
cmake --build .

# 运行测试
./tests/test_ui_interaction
# 或运行所有测试
ctest --verbose
```

### 重要说明

1. **必须在 build 目录构建**：不要在项目根目录直接运行 `cmake .`
2. **Qt 路径**：根据你的 Qt 安装位置调整 `CMAKE_PREFIX_PATH`
3. **可执行文件位置**：构建后的测试在 `build/tests/` 目录
4. **清理构建**：`rm -rf build` 即可清理所有构建产物

### 设置 Qt 环境变量（可选）

为避免每次指定 Qt 路径，可在 `~/.zshrc` 添加：

```bash
export CMAKE_PREFIX_PATH="/Users/你的用户名/Qt/6.x.x/macos:$CMAKE_PREFIX_PATH"
export PATH="/Users/你的用户名/Qt/6.x.x/macos/bin:$PATH"
```

然后：
```bash
source ~/.zshrc
cd playground/diagramscene_ultima/build
cmake .. && cmake --build .
```

## 应用打包

```bash
# 安装打包工具
uv pip install pyinstaller

# 先构建前端
cd frontend && pnpm build && cd ..

# 打包应用
pyinstaller --name="PyWebViewApp" \
  --windowed \
  --add-data="frontend/dist:frontend/dist" \
  --hidden-import=webview \
  app.py

# 输出在 dist/PyWebViewApp.app (macOS)
```

## 开发人员

- [YueZheng-Sea-angle](https://github.com/YueZheng-Sea-angle)
- [Elecmonkey](https://www.elecmonkey.com)