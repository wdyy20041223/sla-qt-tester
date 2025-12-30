/**
 * 单元测试 API
 */

// ==================== 类型定义 ====================

export interface UnitTestFile {
  name: string
  file_path: string
  executable_path: string
  exists: boolean
}

export interface TestCaseResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message?: string
}

export interface TestResult {
  test_name: string
  status: 'passed' | 'failed' | 'error'
  total: number
  passed: number
  failed: number
  skipped: number
  duration: string
  output: string
  details: TestCaseResult[]
  run_id?: number
  ai_analysis?: string  // AI 分析结果（Markdown 格式）
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
 * 扫描项目的单元测试
 */
export async function scanUnitTests(projectPath: string): Promise<UnitTestFile[]> {
  return callPy<UnitTestFile[]>('scan_unit_tests', projectPath)
}

/**
 * 运行单元测试
 */
export async function runUnitTest(executablePath: string, testName: string, projectPath: string): Promise<TestResult> {
  return callPy<TestResult>('run_unit_test', executablePath, testName, projectPath)
}

/**
 * 运行 UI 测试（含截图记录）
 */
export async function runUiTest(executablePath: string, testName: string, projectPath: string): Promise<TestResult> {
  return callPy<TestResult>('run_ui_test_with_record', executablePath, testName, projectPath)
}

/**
 * AI 分析测试失败
 */
export async function analyzeTestFailure(
  projectPath: string,
  testName: string,
  testFilePath: string,
  failureOutput: string,
  runId?: number
): Promise<string> {
  return callPy<string>('analyze_test_failure', projectPath, testName, testFilePath, failureOutput, runId)
}
