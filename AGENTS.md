# 开发规范 - SLA Qt Tester

> 本文档面向 AI Agent 和开发者，规范项目开发流程和注意事项

## 架构原则

### 分层设计
```
frontend (React/TS)  ←→  backend (PyWebView Bridge)  ←→  core (纯 Python 逻辑)
```

- **core/**: 纯业务逻辑，不依赖 GUI 框架，可独立测试
- **backend/**: PyWebView 桥接层，负责 JS ↔ Python 通信
- **frontend/**: Vite + React UI，通过 RPC 调用 Python

### 关键约束
- JS ↔ Python 只能传递 **JSON 可序列化对象**（无法传递函数、类实例等）
- 所有 Python 调用在前端都是 **异步的**，必须使用 `async/await`
- 开发/生产模式端口必须一致：`backend/config.py` 和 `frontend/vite.config.ts`

## 开发流程

### 1. 添加新功能 API

**步骤**：
1. 在 `core/` 实现纯 Python 业务逻辑
2. 在 `backend/api.py` 的 `API` 类中暴露方法
3. 在 `frontend/src/api/py.ts` 添加 TypeScript 类型定义
4. 在前端组件中调用

### 2. 模块化组织

当 API 数量增多时，必须按功能模块分组，**前后端保持对应**：

```
core/
├── calculator/
├── user_service/
└── qt_tester/

backend/
├── api.py              # 主入口
├── calculator_api.py
├── user_api.py
└── qt_tester_api.py

frontend/src/api/
├── py.ts               # 通用调用函数
├── calculator.ts       # 对应 calculator_api
├── user.ts             # 对应 user_api
└── qt-tester.ts        # 对应 qt_tester_api
```

**避免**:所有逻辑和类型定义堆积在单一文件中！

### 3. 配置修改

窗口宽度请在 `backend/config.py` 中更新；更改端口时，需同步更新 `backend/config.py` 和 `frontend/vite.config.ts` 中的端口配置。

## 技术栈规范

### Python
- **版本**: Python 3.10+
- **依赖管理**: `uv`
- **虚拟环境**: `.venv/` (已在 `.gitignore`)
- **代码风格**: 遵循 PEP 8

### 前端
- **包管理器**: `pnpm`
- **构建工具**: Vite
- **框架**: React 19 + TypeScript
- **样式**: TailwindCSS 4
- **类型检查**: 使用 `pnpm type-check` 而非构建时检查

### 开发工具
- **开发模式**: `python run_dev.py` (自动启动 Vite + PyWebView)
- **生产模式**: 先 `pnpm build`，再 `python app.py`
- **打包**: PyInstaller

## 常见问题

### 1. 端口冲突
- 默认端口 `9033`，如已占用需同步修改 Python 和前端配置
- 使用 `lsof -i :9033` 检查端口占用

### 2. 前端构建
- 生产模式必须先构建：`cd frontend && pnpm build`
- 打包前也必须构建前端，否则 `dist/` 目录不存在

### 3. 类型安全
- 前端调用 Python 时，必须在 `py.ts` 中定义准确的类型
- 避免使用 `any`，使用 `unknown` + 类型断言

### 4. 异步处理
- 前端调用 Python 必须使用 `await`
- 所有 Python 方法在 JS 中都是异步的

### 5. 数据传递限制
- 只能传递 JSON 可序列化对象（字典、列表、基本类型）
- 不能传递类实例、函数等复杂对象

### 6. Qt 项目测试编译
- **必须在 build 目录构建**：`mkdir -p build && cd build && cmake .. && cmake --build .`
- **不要在项目根目录运行 cmake**：会污染源代码目录，导致 git 状态混乱
- **可执行文件查找逻辑**：后端扫描器在 `project_dir/build/tests/` 查找测试可执行文件
- **Qt 路径配置**：使用 `-DCMAKE_PREFIX_PATH=/path/to/Qt/6.x.x/macos` 指定 Qt 安装路径
- **清理构建产物**：删除整个 `build` 目录即可，不影响源代码

## Qt 测试开发规范

### 测试文件组织
```
playground/项目名/
├── tests/
│   ├── CMakeLists.txt          # 测试构建配置
│   ├── test_*.cpp              # 测试源文件
│   └── README_*.md             # 测试文档（可选）
└── build/                      # 构建目录（gitignored）
    └── tests/
        └── test_*              # 编译后的可执行文件
```

### 测试扫描逻辑
后端 `core/qt_project/unit_test_scanner.py` 的查找规则：
1. 扫描 `tests/` 目录下的 `test_*.cpp` 文件
2. 在 `build/tests/` 目录查找对应的可执行文件
3. macOS 优先查找 `.app` 包，回退到普通可执行文件
4. 返回测试信息（包含 `exists` 字段标识可执行文件是否存在）

### 编译流程示例
```bash
cd playground/diagramscene_ultima
mkdir -p build && cd build
cmake -DCMAKE_PREFIX_PATH=/Users/用户名/Qt/6.10.1/macos ..
cmake --build .
ctest --verbose  # 运行所有测试
```