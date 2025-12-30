import { useState, useEffect } from 'react'
import { getTestHistory, getTestDetail } from '../api/test-history'
import type { TestRun, TestRunDetail } from '../api/test-history'
import { Clock, CheckCircle, XCircle, AlertCircle, Image as ImageIcon, FileText } from 'lucide-react'
import { renderMarkdown } from '../utils/markdown'

interface TestHistoryPanelProps {
  projectPath: string
  refreshTrigger?: number
}

export function TestHistoryPanel({ projectPath, refreshTrigger }: TestHistoryPanelProps) {
  const [history, setHistory] = useState<TestRun[]>([])
  const [selectedRun, setSelectedRun] = useState<TestRunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [renderedAiAnalysis, setRenderedAiAnalysis] = useState<string>('')
  const [renderingAi, setRenderingAi] = useState(false)

  // 加载历史记录
  const loadHistory = async () => {
    console.log('📚 开始加载测试历史, 项目路径:', projectPath, 'refreshTrigger:', refreshTrigger)
    setLoading(true)
    try {
      const runs = await getTestHistory(projectPath)
      console.log('📚 加载到的历史记录数量:', runs.length)
      if (runs.length > 0) {
        console.log('📚 最新的一条记录:', runs[0])
      }
      setHistory(runs)
    } catch (error) {
      console.error('❌ 加载历史记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔄 TestHistoryPanel useEffect 触发, projectPath:', projectPath, 'refreshTrigger:', refreshTrigger)
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, refreshTrigger])

  // 加载详情
  const handleSelectRun = async (run: TestRun) => {
    setDetailLoading(true)
    setRenderedAiAnalysis('')
    try {
      const detail = await getTestDetail(run.id)
      console.log('📊 测试详情:', detail)
      console.log('🖼️ 截图数量:', detail.screenshots?.length || 0)
      console.log('📝 测试类型:', detail.test_type)
      if (detail.screenshots && detail.screenshots.length > 0) {
        console.log('🎯 第一张截图:', detail.screenshots[0])
      }
      setSelectedRun(detail)

      // 如果有 AI 分析，渲染 Markdown
      if (detail.ai_analysis) {
        setRenderingAi(true)
        try {
          const rendered = await renderMarkdown(detail.ai_analysis)
          setRenderedAiAnalysis(rendered)
        } catch (error) {
          console.error('渲染 AI 分析失败:', error)
          // 如果渲染失败，使用原始文本
          setRenderedAiAnalysis(detail.ai_analysis)
        } finally {
          setRenderingAi(false)
        }
      }
    } catch (error) {
      console.error('加载详情失败:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClass = "px-2 py-0.5 rounded text-xs font-medium"
    switch (status) {
      case 'passed':
        return <span className={`${baseClass} bg-green-100 text-green-700`}>通过</span>
      case 'failed':
        return <span className={`${baseClass} bg-red-100 text-red-700`}>失败</span>
      default:
        return <span className={`${baseClass} bg-yellow-100 text-yellow-700`}>错误</span>
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">加载中...</div>
  }

  return (
    <div className="flex h-full gap-4">
      {/* 左侧：历史列表 */}
      <div className="w-1/3 flex flex-col border-r">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">测试历史</h3>
          <p className="text-sm text-gray-500 mt-1">共 {history.length} 条记录</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-4 text-center text-gray-500">暂无测试记录</div>
          ) : (
            <div className="space-y-2 p-4">
              {history.map(run => (
                <div
                  key={run.id}
                  onClick={() => handleSelectRun(run)}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedRun?.id === run.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="font-medium text-sm">{run.test_name}</span>
                    </div>
                    {getStatusBadge(run.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(run.created_at)}
                    </span>
                    <span>{run.duration}</span>
                    {run.test_type === 'ui' && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <ImageIcon className="w-3 h-3" />
                        UI
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-green-600">✓ {run.passed}</span>
                    <span className="text-red-600">✗ {run.failed}</span>
                    {run.skipped > 0 && <span className="text-gray-500">⊘ {run.skipped}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：详情 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            加载详情中...
          </div>
        ) : selectedRun ? (
          <>
            {/* 详情头部 */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{selectedRun.test_name}</h3>
                {getStatusBadge(selectedRun.status)}
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>{formatDate(selectedRun.created_at)}</span>
                <span>耗时: {selectedRun.duration}</span>
                <span>类型: {selectedRun.test_type === 'ui' ? 'UI 测试' : '单元测试'}</span>
              </div>
            </div>

            {/* 详情内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 测试用例详情 */}
              {selectedRun.details && selectedRun.details.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    测试用例
                  </h4>
                  <div className="space-y-1">
                    {selectedRun.details.map(detail => (
                      <div
                        key={detail.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <span className="flex-1">{detail.case_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${detail.status === 'PASS'
                          ? 'bg-green-100 text-green-700'
                          : detail.status === 'FAIL'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}>
                          {detail.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UI 测试截图 */}
              {selectedRun.test_type === 'ui' && selectedRun.screenshots && selectedRun.screenshots.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    测试截图 ({selectedRun.screenshots.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRun.screenshots.map(shot => (
                      <div key={shot.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 text-sm font-medium">
                          步骤 {shot.step_number}: {shot.step_name}
                        </div>
                        <img
                          src={`data:image/png;base64,${shot.image_data}`}
                          alt={shot.step_name}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 输出日志 */}
              <div>
                <h4 className="font-medium mb-2">测试输出</h4>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                  {selectedRun.output}
                </pre>
              </div>

              {/* AI 分析 */}
              {selectedRun.ai_analysis && (
                <div>
                  <h4 className="font-medium mb-2">AI 分析报告</h4>
                  {renderingAi ? (
                    <div className="bg-purple-50 border border-purple-200 rounded p-4 text-sm text-gray-500">
                      正在渲染 AI 分析...
                    </div>
                  ) : (
                    <div className="bg-purple-50 border border-purple-200 rounded p-4 text-sm prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: renderedAiAnalysis }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            选择一条记录查看详情
          </div>
        )}
      </div>
    </div>
  )
}
