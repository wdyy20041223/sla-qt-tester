"""
窗口管理
"""
import webview
from pathlib import Path
from .api import API
from .config import (
    WINDOW_TITLE,
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    WINDOW_MIN_WIDTH,
    WINDOW_MIN_HEIGHT,
    DEV_SERVER_URL,
    FRONTEND_DIST,
)
from core.utils.logger import logger


def create_window(dev: bool = False) -> webview.Window:
    """
    创建 PyWebView 窗口

    Args:
        dev: 是否开发模式
            - True: 加载 Vite dev server (http://localhost:5173)
            - False: 加载打包后的 dist/index.html
    """
    # 确定 URL
    if dev:
        url = DEV_SERVER_URL
        logger.info(f"开发模式: 加载 {url}")
    else:
        index_path = FRONTEND_DIST / "index.html"
        if not index_path.exists():
            logger.error(f"生产模式: 找不到 {index_path}")
            logger.error("请先运行: cd frontend && npm run build")
            raise FileNotFoundError(f"找不到前端构建文件: {index_path}")
        url = str(index_path)
        logger.info(f"生产模式: 加载 {url}")

    # 创建 API 实例
    api = API()

    # 创建窗口
    window = webview.create_window(
        title=WINDOW_TITLE,
        url=url,
        js_api=api,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        min_size=(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT),
        resizable=False,
        frameless=False,
        easy_drag=True,
        background_color="#FFFFFF",
    )

    logger.info("窗口创建成功")
    return window


def start_app(dev: bool = False):
    """
    启动应用

    Args:
        dev: 是否开发模式
    """
    window = create_window(dev=dev)
    webview.start(debug=dev)
    logger.info("应用已关闭")
