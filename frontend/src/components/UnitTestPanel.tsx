import { useState, useEffect } from 'react'
import { scanUnitTests, runUnitTest, runUiTest, analyzeTestFailure } from '../api/unit-test'
import type { UnitTestFile, TestResult } from '../api/unit-test'
import { renderMarkdown } from '../utils/markdown'
import { TestHistoryPanel } from './TestHistoryPanel'

interface UnitTestPanelProps {
  projectPath: string
  onViewFile?: (filePath: string) => void
}

export function UnitTestPanel({ projectPath, onViewFile }: UnitTestPanelProps) {
  const [activeTab, setActiveTab] = useState<'tests' | 'history'>('tests')
  const [tests, setTests] = useState<UnitTestFile[]>([])
  const [results, setResults] = useState<Map<string, TestResult>>(new Map())
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<Map<string, string>>(new Map())
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set())
  const [renderingMarkdown, setRenderingMarkdown] = useState<Set<string>>(new Set())
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

  // 扫描测试
  const handleScan = async () => {
    setLoading(true)
    try {
      const testList = await scanUnitTests(projectPath)
      setTests(testList)
    } catch (error) {
      console.error('扫描测试失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 运行单个测试
  const handleRunTest = async (test: UnitTestFile) => {
    if (!test.exists) {
      alert('测试可执行文件不存在，请先编译项目')
      return
    }

    setRunning(prev => new Set(prev).add(test.name))
    try {
      console.log('🚀 开始运行测试:', test.name, '项目路径:', projectPath)

      // 判断是否为 UI 测试（包含 ui 或 interaction 关键字）
      const isUiTest = test.name.toLowerCase().includes('ui') ||
        test.name.toLowerCase().includes('interaction')

      const result = isUiTest
        ? await runUiTest(test.executable_path, test.name, projectPath)
        : await runUnitTest(test.executable_path, test.name, projectPath)

      console.log('✅ 测试完成:', test.name, '结果:', result)
      console.log('📝 run_id:', result.run_id)

      setResults(prev => new Map(prev).set(test.name, result))
      setSelectedTest(test.name)

      // 刷新测试历史
      console.log('🔄 触发历史刷新, 当前触发器值:', historyRefreshTrigger)
      setHistoryRefreshTrigger(prev => prev + 1)
      console.log('🔄 新的触发器值将是:', historyRefreshTrigger + 1)
    } catch (error) {
      console.error('❌ 运行测试失败:', error)
    } finally {
      setRunning(prev => {
        const newSet = new Set(prev)
        newSet.delete(test.name)
        return newSet
      })
    }
  }

  // 运行全部测试
  const handleRunAll = async () => {
    for (const test of tests) {
      if (test.exists) {
        await handleRunTest(test)
      }
    }
  }

  // AI 分析失败测试
  const handleAnalyze = async (test: UnitTestFile) => {
    const result = results.get(test.name)
    if (!result || result.status !== 'failed') {
      return
    }

    setAnalyzing(prev => new Set(prev).add(test.name))
    setRenderingMarkdown(prev => new Set(prev).add(test.name))

    try {
      console.log('🤖 开始 AI 分析, run_id:', result.run_id)

      const analysis = await analyzeTestFailure(
        projectPath,
        test.name,
        test.file_path,
        result.output,
        result.run_id  // 传递 run_id
      )

      // 渲染 Markdown（异步）
      const renderedHtml = await renderMarkdown(analysis)
      setAiAnalysis(prev => new Map(prev).set(test.name, renderedHtml))

      // 刷新测试历史（AI 分析已同步到数据库）
      console.log('🔄 AI 分析完成，刷新测试历史')
      setHistoryRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('AI 分析失败:', error)
      setAiAnalysis(prev => new Map(prev).set(test.name, `分析失败: ${error}`))
    } finally {
      setAnalyzing(prev => {
        const newSet = new Set(prev)
        newSet.delete(test.name)
        return newSet
      })
      setRenderingMarkdown(prev => {
        const newSet = new Set(prev)
        newSet.delete(test.name)
        return newSet
      })
    }
  }

  // 初始加载
  useEffect(() => {
    handleScan()
  }, [projectPath])

  const selectedResult = selectedTest ? results.get(selectedTest) : null
  const selectedAnalysis = selectedTest ? aiAnalysis.get(selectedTest) : null

  return (
    <div className="flex flex-col h-full">
      {/* 标签页 */}
      <div className="flex gap-2 border-b mb-4">
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tests'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          📝 运行测试
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          📊 测试历史
        </button>
      </div>

      {/* 标签页内容 */}
      {/* 测试历史标签页 */}
      <div className={`flex-1 overflow-hidden ${activeTab === 'history' ? '' : 'hidden'}`}>
        <TestHistoryPanel projectPath={projectPath} refreshTrigger={historyRefreshTrigger} />
      </div>

      {/* 运行测试标签页 */}
      <div className={`flex-1 overflow-y-auto space-y-4 ${activeTab === 'tests' ? '' : 'hidden'}`}>
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {loading ? '扫描中...' : '🔄 扫描测试'}
          </button>
          <button
            onClick={handleRunAll}
            disabled={tests.length === 0 || running.size > 0}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
          >
            ▶ 运行全部
          </button>
        </div>

        {/* 测试列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            📁 测试文件列表
          </h3>

          {tests.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">未找到测试文件</p>
              <p className="text-xs mt-2">请在项目的 tests 目录添加 test_*.cpp 文件</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tests.map((test) => {
                const result = results.get(test.name)
                const isRunning = running.has(test.name)
                const statusIcon = result
                  ? result.status === 'passed'
                    ? '✅'
                    : '❌'
                  : test.exists
                    ? '⚪'
                    : '⚠️'

                return (
                  <div
                    key={test.name}
                    className={`p-3 rounded-lg border transition-colors ${selectedTest === test.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{statusIcon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-white">
                            {test.name}
                          </div>
                          {result && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {result.passed} passed, {result.failed} failed • {result.duration}
                              {result.ai_analysis && (
                                <span className="ml-2 text-purple-600 dark:text-purple-400">
                                  • 🤖 已自动分析
                                </span>
                              )}
                            </div>
                          )}
                          {!test.exists && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ 可执行文件不存在，请先编译
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunTest(test)}
                          disabled={!test.exists || isRunning}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                        >
                          {isRunning ? '⏳ 运行中...' : '▶ 运行'}
                        </button>
                        {result && result.status === 'failed' && (
                          <button
                            onClick={() => handleAnalyze(test)}
                            disabled={analyzing.has(test.name) || renderingMarkdown.has(test.name)}
                            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
                          >
                            {renderingMarkdown.has(test.name)
                              ? '🎨 渲染中...'
                              : analyzing.has(test.name)
                                ? '🤔 分析中...'
                                : '🤖 AI 分析'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (onViewFile && test.file_path) {
                              onViewFile(test.file_path)
                            }
                          }}
                          disabled={!test.file_path}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
                        >
                          📄 查看
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 测试结果详情 */}
        {selectedResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              📊 测试结果详情
            </h3>

            <div className="space-y-3">
              {/* 概览 */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800 dark:text-white">
                    {selectedResult.test_name}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${selectedResult.status === 'passed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                  >
                    {selectedResult.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  总计: {selectedResult.total} • 通过: {selectedResult.passed} • 失败:{' '}
                  {selectedResult.failed} • 耗时: {selectedResult.duration}
                </div>
              </div>

              {/* 测试用例详情 */}
              {selectedResult.details && selectedResult.details.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    测试用例
                  </h4>
                  <div className="space-y-1">
                    {selectedResult.details.map((detail, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${detail.status === 'PASS'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{detail.status === 'PASS' ? '✓' : '✗'}</span>
                          <span className="font-medium">{detail.name}</span>
                        </div>
                        {detail.message && (
                          <div className="ml-6 mt-1 text-xs opacity-75">{detail.message}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 分析结果 */}
              {selectedAnalysis && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                    <span>🤖</span>
                    <span>AI 分析结果</span>
                  </h4>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto
                    prose-headings:text-purple-900 dark:prose-headings:text-purple-100
                    prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:break-words
                    prose-code:text-purple-600 dark:prose-code:text-purple-400
                    prose-code:bg-purple-100 dark:prose-code:bg-purple-900/30
                    prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:break-all
                    prose-strong:text-purple-900 dark:prose-strong:text-purple-100
                    prose-ul:text-gray-800 dark:prose-ul:text-gray-200
                    prose-ol:text-gray-800 dark:prose-ol:text-gray-200
                    prose-li:break-words
                    [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!bg-transparent
                    [&_.shiki]:!bg-gray-900 [&_.shiki]:!p-4 [&_.shiki]:!rounded-lg
                    [&_.shiki]:overflow-x-auto [&_.shiki]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: selectedAnalysis }}
                  />
                </div>
              )}

              {/* 完整输出 */}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  查看完整输出
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                  {selectedResult.output}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
