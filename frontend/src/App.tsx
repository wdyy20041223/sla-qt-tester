import { useState, useEffect } from 'react'
import { scanQtProjects, getProjectDetail } from './api/qt-project'
import type { QtProject, ProjectDetail } from './api/qt-project'

function App() {
  // 项目列表状态
  const [projects, setProjects] = useState<QtProject[]>([])
  const [selectedProject, setSelectedProject] = useState<QtProject | null>(null)
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null)
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
      const detail = await getProjectDetail(project.path)
      setProjectDetail(detail)
    } catch (error) {
      console.error('加载项目详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            SLA Qt Tester
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Qt 项目可视化测试工具
          </p>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：项目列表 */}
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
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
                <p>未找到 Qt 项目</p>
                <p className="text-sm mt-2">请在 playground 目录添加项目</p>
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <button
                    key={project.path}
                    onClick={() => handleSelectProject(project)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedProject?.path === project.path
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="font-medium text-gray-800 dark:text-white">
                      {project.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {project.project_type === 'qmake' ? 'QMake' : 'CMake'}
                    </div>
                    {project.description && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {project.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* 右侧：项目详情 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {!selectedProject ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-lg">请选择一个项目</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          ) : projectDetail ? (
            <div className="p-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  {projectDetail.name}
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <InfoCard label="C++ 文件" value={projectDetail.cpp_count} />
                  <InfoCard label="头文件" value={projectDetail.header_count} />
                  <InfoCard label="UI 文件" value={projectDetail.ui_count} />
                  <InfoCard label="资源文件" value={projectDetail.qrc_count} />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    项目路径
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    {projectDetail.path}
                  </p>
                </div>

                {projectDetail.cpp_files.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                      源文件列表
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {projectDetail.cpp_files.map((file) => (
                        <div
                          key={file}
                          className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded"
                        >
                          📄 {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectDetail.header_files.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                      头文件列表
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {projectDetail.header_files.map((file) => (
                        <div
                          key={file}
                          className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded"
                        >
                          📋 {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
    </div>
  )
}

export default App
