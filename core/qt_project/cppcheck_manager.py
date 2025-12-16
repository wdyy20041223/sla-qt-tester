"""
Cppcheck 管理模块
负责检测、下载和安装 cppcheck 到项目内部
"""
import os
import platform
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Optional, Dict
import urllib.request

from core.utils.logger import logger


class CppcheckManager:
    """管理 cppcheck 的安装和检测"""
    
    # Windows 下载链接 (使用 2.13.0 版本，这个版本有稳定的便携版)
    # 注意：GitHub releases 中不是所有版本都提供便携版 zip
    WINDOWS_PORTABLE_URL = "https://github.com/danmar/cppcheck/releases/download/2.13.0/cppcheck-2.13.0-x64.zip"
    
    # 备用方案：使用 Chocolatey 安装（Windows 包管理器）
    WINDOWS_CHOCO_PACKAGE = "cppcheck"
    
    def __init__(self, project_root: Optional[Path] = None):
        """
        初始化 cppcheck 管理器
        
        Args:
            project_root: 项目根目录，如果为 None 则使用当前工作目录的父目录
        """
        if project_root is None:
            project_root = Path(__file__).parent.parent.parent
        
        self.project_root = Path(project_root)
        self.tools_dir = self.project_root / "tools"
        self.cppcheck_dir = self.tools_dir / "cppcheck"
        self.system = platform.system()
        
    def check_system_cppcheck(self) -> Optional[str]:
        """
        检查系统中是否已安装 cppcheck
        
        Returns:
            如果找到返回 cppcheck 路径，否则返回 None
        """
        try:
            result = subprocess.run(
                ["cppcheck", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                cppcheck_path = shutil.which("cppcheck")
                logger.info(f"系统已安装 cppcheck: {cppcheck_path}, {result.stdout.strip()}")
                return cppcheck_path
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return None
    
    def check_local_cppcheck(self) -> Optional[str]:
        """
        检查项目 tools 目录中是否有 cppcheck
        
        Returns:
            如果找到返回 cppcheck 路径，否则返回 None
        """
        if self.system == "Windows":
            cppcheck_exe = self.cppcheck_dir / "cppcheck.exe"
        else:
            cppcheck_exe = self.cppcheck_dir / "bin" / "cppcheck"
        
        if cppcheck_exe.exists():
            logger.info(f"找到项目本地 cppcheck: {cppcheck_exe}")
            return str(cppcheck_exe)
        
        return None
    
    def get_cppcheck_path(self) -> Optional[str]:
        """
        获取 cppcheck 路径（优先系统，其次本地）
        
        Returns:
            cppcheck 路径，如果未找到返回 None
        """
        # 先检查系统
        system_path = self.check_system_cppcheck()
        if system_path:
            return system_path
        
        # 再检查本地
        local_path = self.check_local_cppcheck()
        if local_path:
            return local_path
        
        return None
    
    def download_file(self, url: str, dest_path: Path, progress_callback=None) -> bool:
        """
        下载文件
        
        Args:
            url: 下载链接
            dest_path: 目标路径
            progress_callback: 进度回调函数 (bytes_downloaded, total_bytes)
        
        Returns:
            是否下载成功
        """
        try:
            logger.info(f"开始下载: {url}")
            
            # 创建目标目录
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            def report_hook(block_num, block_size, total_size):
                if progress_callback:
                    downloaded = block_num * block_size
                    progress_callback(downloaded, total_size)
            
            urllib.request.urlretrieve(url, dest_path, reporthook=report_hook)
            logger.info(f"下载完成: {dest_path}")
            return True
            
        except Exception as e:
            logger.error(f"下载失败: {e}")
            return False
    
    def install_windows_with_winget(self) -> bool:
        """
        使用 winget 安装 cppcheck (Windows 10/11 推荐)
        
        Returns:
            是否安装成功
        """
        try:
            logger.info("尝试使用 winget 安装 cppcheck...")
            result = subprocess.run(
                ["winget", "install", "--id", "Cppcheck.Cppcheck", "-e", "--silent"],
                capture_output=True,
                text=True,
                timeout=300
            )
            if result.returncode == 0 or "successfully installed" in result.stdout.lower():
                logger.info("Cppcheck 通过 winget 安装成功")
                return True
            
            logger.warning(f"winget 安装失败: {result.stderr}")
            return False
            
        except FileNotFoundError:
            logger.warning("winget 未找到，尝试其他安装方式")
            return False
        except Exception as e:
            logger.error(f"winget 安装失败: {e}")
            return False
    
    def install_windows_portable(self, progress_callback=None) -> bool:
        """
        在 Windows 上安装便携版 cppcheck
        
        Args:
            progress_callback: 进度回调函数
        
        Returns:
            是否安装成功
        """
        try:
            # 下载便携版
            zip_path = self.tools_dir / "cppcheck.zip"
            logger.info(f"尝试从 {self.WINDOWS_PORTABLE_URL} 下载...")
            
            if not self.download_file(self.WINDOWS_PORTABLE_URL, zip_path, progress_callback):
                logger.error("下载便携版失败")
                return False
            
            # 解压
            logger.info(f"解压到: {self.cppcheck_dir}")
            self.cppcheck_dir.mkdir(parents=True, exist_ok=True)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.cppcheck_dir)
            
            # 删除下载的压缩包
            zip_path.unlink()
            
            # 验证安装
            cppcheck_exe = self.cppcheck_dir / "cppcheck.exe"
            if not cppcheck_exe.exists():
                logger.error("安装失败: 未找到 cppcheck.exe")
                return False
            
            logger.info("Cppcheck 便携版安装成功")
            return True
            
        except Exception as e:
            logger.error(f"便携版安装失败: {e}")
            return False
    
    def install_linux_from_package_manager(self) -> bool:
        """
        在 Linux 上通过包管理器安装 cppcheck
        
        Returns:
            是否安装成功
        """
        try:
            # 尝试使用 apt
            logger.info("尝试使用 apt 安装 cppcheck...")
            result = subprocess.run(
                ["sudo", "apt-get", "install", "-y", "cppcheck"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info("Cppcheck 安装成功")
                return True
            
            # 尝试使用 yum
            logger.info("尝试使用 yum 安装 cppcheck...")
            result = subprocess.run(
                ["sudo", "yum", "install", "-y", "cppcheck"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info("Cppcheck 安装成功")
                return True
            
            logger.error("无法通过包管理器安装 cppcheck")
            return False
            
        except Exception as e:
            logger.error(f"安装失败: {e}")
            return False
    
    def install_macos_from_homebrew(self) -> bool:
        """
        在 macOS 上通过 Homebrew 安装 cppcheck
        
        Returns:
            是否安装成功
        """
        try:
            logger.info("使用 Homebrew 安装 cppcheck...")
            result = subprocess.run(
                ["brew", "install", "cppcheck"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info("Cppcheck 安装成功")
                return True
            
            logger.error(f"安装失败: {result.stderr}")
            return False
            
        except Exception as e:
            logger.error(f"安装失败: {e}")
            return False
    
    def install(self, progress_callback=None) -> Dict[str, any]:
        """
        自动安装 cppcheck 到项目内部
        
        Args:
            progress_callback: 进度回调函数
        
        Returns:
            安装结果字典 {success: bool, path: str, message: str}
        """
        # 先检查是否已存在
        existing_path = self.get_cppcheck_path()
        if existing_path:
            return {
                "success": True,
                "path": existing_path,
                "message": f"Cppcheck 已存在: {existing_path}"
            }
        
        # 根据系统选择安装方式
        success = False
        error_messages = []
        
        if self.system == "Windows":
            # Windows: 尝试多种安装方式
            logger.info("尝试 Windows 安装方式...")
            
            # 方式1: 使用 winget (推荐)
            logger.info("方式1: 尝试使用 winget 安装...")
            success = self.install_windows_with_winget()
            if success:
                logger.info("✓ winget 安装成功")
            else:
                error_messages.append("winget 安装失败")
                
                # 方式2: 下载便携版
                logger.info("方式2: 尝试下载便携版...")
                success = self.install_windows_portable(progress_callback)
                if success:
                    logger.info("✓ 便携版安装成功")
                else:
                    error_messages.append("便携版下载失败")
        
        elif self.system == "Linux":
            success = self.install_linux_from_package_manager()
            if not success:
                error_messages.append("包管理器安装失败")
        
        elif self.system == "Darwin":  # macOS
            success = self.install_macos_from_homebrew()
            if not success:
                error_messages.append("Homebrew 安装失败")
        
        else:
            return {
                "success": False,
                "path": None,
                "message": f"不支持的操作系统: {self.system}"
            }
        
        if success:
            cppcheck_path = self.get_cppcheck_path()
            return {
                "success": True,
                "path": cppcheck_path,
                "message": f"Cppcheck 安装成功: {cppcheck_path}"
            }
        else:
            error_msg = "; ".join(error_messages) if error_messages else "安装失败"
            return {
                "success": False,
                "path": None,
                "message": f"Cppcheck 安装失败 ({error_msg})。\n\n请手动安装:\n- Windows: winget install Cppcheck.Cppcheck\n- Linux: sudo apt install cppcheck\n- macOS: brew install cppcheck"
            }
    
    def get_version(self, cppcheck_path: Optional[str] = None) -> Optional[str]:
        """
        获取 cppcheck 版本
        
        Args:
            cppcheck_path: cppcheck 路径，如果为 None 则自动查找
        
        Returns:
            版本字符串，如果失败返回 None
        """
        if cppcheck_path is None:
            cppcheck_path = self.get_cppcheck_path()
        
        if not cppcheck_path:
            return None
        
        try:
            result = subprocess.run(
                [cppcheck_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                # 输出格式: "Cppcheck 2.15.0"
                return result.stdout.strip()
        except Exception as e:
            logger.error(f"获取版本失败: {e}")
        
        return None
