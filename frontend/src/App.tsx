import { useState, useEffect } from 'react'
import { scanQtProjects, getProjectDetail, getProjectFileTree } from './api/qt-project'
import type { QtProject, ProjectDetail, FileNode } from './api/qt-project'
import { FileTree } from './components/FileTree'

function App() {
  // 项目列表状态
  const [projects, setProjects] = useState<QtProject[]>([])
  const [selectedProject, setSelectedProject] = useState<QtProject | null>(null)
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)

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
    console.log('点击文件:', node)
    // TODO: 在右侧显示文件内容或测试信息
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* 左侧：项目列表 */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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

          <div className="p-2">
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
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      selectedProject?.path === project.path
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
                <FileTree nodes={fileTree} onFileClick={handleFileClick} />
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
          ) : projectDetail ? (
            <div className="p-4">
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
            </div>
          ) : null}
      </main>
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
