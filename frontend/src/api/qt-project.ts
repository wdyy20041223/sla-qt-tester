/**
 * Qt 项目管理 API
 */

// ==================== 类型定义 ====================

export interface QtProject {
  name: string
  path: string
  project_file: string
  project_type: 'qmake' | 'cmake'
  description?: string
}

export interface ProjectDetail {
  path: string
  name: string
  cpp_count: number
  header_count: number
  ui_count: number
  qrc_count: number
  cpp_files: string[]
  header_files: string[]
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  children?: FileNode[]
}

// ==================== API 调用 ====================

async function callPy<T>(fn: string, ...args: unknown[]): Promise<T> {
  if (!window.pywebview) {
    throw new Error('PyWebView API 未就绪')
  }

  const api = window.pywebview.api as unknown as Record<string, (...args: unknown[]) => Promise<T>>
  if (!api[fn]) {
    throw new Error(`Python 方法不存在: ${fn}`)
  }

  return await api[fn](...args)
}

/**
 * 扫描 playground 目录下的 Qt 项目
 */
export async function scanQtProjects(): Promise<QtProject[]> {
  return callPy<QtProject[]>('scan_qt_projects')
}

/**
 * 获取项目详细信息
 */
export async function getProjectDetail(projectPath: string): Promise<ProjectDetail> {
  return callPy<ProjectDetail>('get_project_detail', projectPath)
}

/**
 * 获取项目文件树
 */
export async function getProjectFileTree(projectPath: string): Promise<FileNode[]> {
  return callPy<FileNode[]>('get_project_file_tree', projectPath)
}
