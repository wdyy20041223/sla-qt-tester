import { useState, useEffect } from 'react'
import { scanQtProjects, getProjectDetail, getProjectFileTree } from './api/qt-project'
import type { QtProject, ProjectDetail, FileNode } from './api/qt-project'
import { FileTree } from './components/FileTree'
import { Modal } from './components/Modal'
import { AboutContent } from './components/AboutContent'
import { UnitTestPanel } from './components/UnitTestPanel'
import { FilePreview } from './components/FilePreview'
import { VisualTestPanel } from './components/VisualTestPanel'
import StaticAnalysisPanel from './components/StaticAnalysisPanel'

type ViewMode = 'overview' | 'quality' | 'visual' | 'settings' | 'filePreview' | 'staticAnalysis'

function App() {
  // 项目列表状态
  const [projects, setProjects] = useState<QtProject[]>([])
  const [selectedProject, setSelectedProject] = useState<QtProject | null>(null)
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [fileViewState, setFileViewState] = useState<{ file: FileNode | null; lines?: number[] }>({ file: null })

  // 视图模式和关于弹窗
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [showAbout, setShowAbout] = useState(false)

  // 加载项目列表
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const projectList = await scanQtProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('加载项目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 选择项目
  const handleSelectProject = async (project: QtProject) => {
    setSelectedProject(project)
    setSelectedFile(null)  // 切换项目时清空选中文件
    setLoading(true)
    try {
      const [detail, tree] = await Promise.all([
        getProjectDetail(project.path),
        getProjectFileTree(project.path)
      ])
      setProjectDetail(detail)
      setFileTree(tree)
    } catch (error) {
      console.error('加载项目详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      setSelectedFile(node)
      setFileViewState({ file: node })  // 不带高亮行
      setViewMode('filePreview')  // 自动切换到文件预览标签
    }
  }

  // 打开文件并高亮指定行（支持多行）
  const handleOpenFileAtLine = (filePath: string, lines: number | number[]) => {
    const lineArray = Array.isArray(lines) ? lines : [lines]
    console.log('📂 尝试打开文件:', filePath, '跳转到行:', lineArray)

    // 路径规范化：统一使用反斜杠（Windows）或正斜杠
    const normalizePath = (path: string) => {
      return path.replace(/\\/g, '/').toLowerCase()
    }

    // 从文件树中查找对应的文件节点（支持绝对路径和相对路径匹配）
    const findFileNode = (nodes: FileNode[], targetPath: string): FileNode | null => {
      const normalizedTarget = normalizePath(targetPath)

      for (const node of nodes) {
        if (node.type === 'file') {
          const normalizedNodePath = normalizePath(node.path)

          // 尝试完全匹配
          if (normalizedNodePath === normalizedTarget) {
            console.log('✅ 找到匹配文件（完全匹配）:', node.path)
            return node
          }

          // 尝试后缀匹配（处理绝对路径 vs 相对路径）
          if (normalizedNodePath.endsWith(normalizedTarget) ||
            normalizedTarget.endsWith(normalizedNodePath)) {
            console.log('✅ 找到匹配文件（后缀匹配）:', node.path)
            return node
          }
        }

        if (node.type === 'directory' && node.children) {
          const found = findFileNode(node.children, targetPath)
          if (found) return found
        }
      }
      return null
    }

    const fileNode = findFileNode(fileTree, filePath)
    if (fileNode) {
      console.log('🎯 设置选中文件和高亮行:', fileNode.name, 'lines:', lineArray)
      // 使用单个状态更新确保文件和行号同步
      setSelectedFile(fileNode)
      setFileViewState({ file: fileNode, lines: lineArray })
      setViewMode('filePreview')
    } else {
      console.error('❌ 文件不存在:', filePath)
      alert(`找不到文件: ${filePath}`)
    }
  }

  // 从测试文件路径跳转到文件预览
  const handleViewTestFile = (filePath: string) => {
    console.log('📂 尝试打开测试文件:', filePath)

    // 路径规范化：统一使用反斜杠（Windows）或正斜杠
    const normalizePath = (path: string) => {
      return path.replace(/\\/g, '/').toLowerCase()
    }

    // 从文件树中查找对应的文件节点（支持绝对路径和相对路径匹配）
    const findFileNode = (nodes: FileNode[], targetPath: string): FileNode | null => {
      const normalizedTarget = normalizePath(targetPath)

      for (const node of nodes) {
        if (node.type === 'file') {
          const normalizedNodePath = normalizePath(node.path)

          // 尝试完全匹配
          if (normalizedNodePath === normalizedTarget) {
            console.log('✅ 找到匹配文件（完全匹配）:', node.path)
            return node
          }

          // 尝试后缀匹配（处理绝对路径 vs 相对路径）
          if (normalizedNodePath.endsWith(normalizedTarget) ||
            normalizedTarget.endsWith(normalizedNodePath)) {
            console.log('✅ 找到匹配文件（后缀匹配）:', node.path)
            return node
          }
        }

        if (node.type === 'directory' && node.children) {
          const found = findFileNode(node.children, targetPath)
          if (found) return found
        }
      }
      return null
    }

    const fileNode = findFileNode(fileTree, filePath)
    if (fileNode) {
      console.log('🎯 设置选中文件并切换到预览模式:', fileNode.name)
      setSelectedFile(fileNode)
      setFileViewState({ file: fileNode })
      setViewMode('filePreview')
    } else {
      console.error('❌ 文件不存在:', filePath)
      alert(`找不到文件: ${filePath}`)
    }
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* 左侧：项目列表 */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Qt 项目
          </h2>
          <button
            onClick={loadProjects}
            disabled={loading}
            className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {loading ? '扫描中...' : '刷新项目'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">未找到 Qt 项目</p>
              <p className="text-xs mt-2">请在 playground 目录添加项目</p>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleSelectProject(project)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selectedProject?.path === project.path
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  <div className="font-medium text-gray-800 dark:text-white">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {project.project_type === 'qmake' ? 'QMake' : 'CMake'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 关于按钮 - 固定在底部 */}
        <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setShowAbout(true)}
            className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            关于 SLA Qt Tester
          </button>
        </div>
      </aside>

      {/* 中间：文件树 */}
      {selectedProject && (
        <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
              {selectedProject.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              文件浏览器
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">加载中...</p>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">无文件</p>
              </div>
            ) : (
              <FileTree
                key={selectedProject.path}
                nodes={fileTree}
                onFileClick={handleFileClick}
              />
            )}
          </div>
        </aside>
      )}

      {/* 右侧：测试主体区域 */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {!selectedProject ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">请选择一个项目</p>
              <p className="text-sm mt-2">从左侧列表中选择要测试的 Qt 项目</p>
            </div>
          </div>
        ) : (
          <div className="p-4 h-full flex flex-col">
            {/* 功能模块切换标签 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 inline-flex gap-2 mb-4 shadow-sm flex-shrink-0">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'overview'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                📊 项目概览
              </button>
              <button
                onClick={() => setViewMode('quality')}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'quality'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                📋 质量管理
              </button>
              <button
                onClick={() => setViewMode('staticAnalysis')}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'staticAnalysis'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                🔍 静态分析
              </button>
              <button
                onClick={() => setViewMode('visual')}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'visual'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                🎯 视觉测试
              </button>
              <button
                onClick={() => setViewMode('settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'settings'
                    ? 'bg-gray-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                ⚙️ 设置
              </button>
              <button
                onClick={() => setViewMode('filePreview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'filePreview'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                📄 文件预览
              </button>
            </div>

            {/* 根据 viewMode 显示不同内容 */}
            {viewMode === 'overview' && projectDetail && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  项目概览
                </h2>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <InfoCard label="C++ 文件" value={projectDetail.cpp_count} />
                  <InfoCard label="头文件" value={projectDetail.header_count} />
                  <InfoCard label="UI 文件" value={projectDetail.ui_count} />
                  <InfoCard label="资源文件" value={projectDetail.qrc_count} />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
                    项目路径
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    {projectDetail.path}
                  </p>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    🚧 测试功能开发中
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    测试用例管理和执行功能正在开发中。当前可以浏览项目文件结构。
                  </p>
                </div>
              </div>
            )}

            {viewMode === 'quality' && selectedProject && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  质量管理 - 单元测试
                </h2>
                <UnitTestPanel
                  projectPath={selectedProject.path}
                  onViewFile={handleViewTestFile}
                />
              </div>
            )}

            {viewMode === 'staticAnalysis' && selectedProject && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden h-[calc(100vh-12rem)]">
                <StaticAnalysisPanel
                  projectPath={selectedProject.path}
                  onOpenFile={handleOpenFileAtLine}
                />
              </div>
            )}

            {viewMode === 'visual' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  视觉测试
                </h2>
                <VisualTestPanel />
              </div>
            )}

            {viewMode === 'settings' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  设置
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      应用信息
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>版本: v1.0.0</p>
                      <p>项目路径: {projectDetail?.path}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'filePreview' && (
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <FilePreview
                  file={fileViewState.file}
                  projectPath={selectedProject?.path || ''}
                  highlightLines={fileViewState.lines}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* 关于弹窗 */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="关于 SLA Qt Tester">
        <AboutContent />
      </Modal>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800 dark:text-white">{value}</div>
    </div>
  )
}

export default App
