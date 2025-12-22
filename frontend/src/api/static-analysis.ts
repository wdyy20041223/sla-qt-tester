/**
 * 静态分析 API
 * 提供 cppcheck 集成功能
 */
import { callPy } from './py';

/**
 * Cppcheck 状态信息
 */
export interface CppcheckStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
  message: string;
}

/**
 * 代码问题位置
 */
export interface IssueLocation {
  file: string;
  line: number;
  column: number;
}

/**
 * 代码问题
 */
export interface CodeIssue {
  id: string;
  severity: 'error' | 'warning' | 'style' | 'performance' | 'portability' | 'information';
  message: string;
  verbose: string;
  locations: IssueLocation[];
}

/**
 * 严重程度统计
 */
export interface SeverityStats {
  error: number;
  warning: number;
  style: number;
  performance: number;
  portability: number;
  information: number;
}

/**
 * 错误分类信息
 */
export interface IssueCategory {
  id: string;
  severity: string;
  count: number;
  message: string;
  issues: CodeIssue[];
}

/**
 * 分析统计信息
 */
export interface AnalysisStatistics {
  files_checked: number;
  total_issues: number;
  error_count: number;
  warning_count: number;
  severity_stats: SeverityStats;
  category_count: number;
  timestamp: string;
}

/**
 * 项目分析结果
 */
export interface ProjectAnalysisResult {
  success: boolean;
  message: string;
  errors: CodeIssue[];
  warnings: CodeIssue[];
  categories: IssueCategory[];
  statistics: AnalysisStatistics;
}

/**
 * 文件分析结果
 */
export interface FileAnalysisResult {
  success: boolean;
  message: string;
  issues: CodeIssue[];
}

/**
 * 安装结果
 */
export interface InstallResult {
  success: boolean;
  path: string | null;
  message: string;
}

/**
 * Cppcheck 选项配置
 */
export interface CppcheckOptions {
  /** 启用不确定的检查（可能有误报） */
  inconclusive?: boolean;
  /** 并行检查的线程数 */
  jobs?: number;
  /** 最大配置检查数 */
  max_configs?: number;
  /** 目标平台 (unix32, unix64, win32A, win32W, win64) */
  platform?: string;
  /** C++ 标准 (c++11, c++14, c++17, c++20, c++23) */
  std?: string;
}

/**
 * 检查类别选项 (cppcheck --enable 参数)
 * 注意：这是检查类别，不是严重程度
 * - 检查类别：控制 cppcheck 检查哪些类型的问题
 * - 严重程度：检查结果中每个问题的严重等级 (error/warning/style/...)
 */
export interface CheckTypeOptions {
  warning: boolean;      // 启用警告级别检查（默认启用）
  style: boolean;        // 启用代码风格检查
  performance: boolean;  // 启用性能问题检查
  portability: boolean;  // 启用可移植性问题检查
  information: boolean;  // 启用信息性消息
  unusedFunction: boolean; // 启用未使用函数检查（较慢）
  missingInclude: boolean; // 启用缺失头文件检查（较慢）
}

/**
 * 检查 cppcheck 安装状态
 */
export async function checkCppcheckStatus(): Promise<CppcheckStatus> {
  return await callPy<CppcheckStatus>('check_cppcheck_status');
}

/**
 * 安装 cppcheck
 */
export async function installCppcheck(): Promise<InstallResult> {
  return await callPy<InstallResult>('install_cppcheck');
}

/**
 * 分析项目
 */
export async function analyzeProject(
  projectDir: string,
  options?: {
    includePaths?: string[];
    enableChecks?: string[];
    checkTypes?: CheckTypeOptions;
    severity?: string;
    cppcheckOptions?: CppcheckOptions;
  }
): Promise<ProjectAnalysisResult> {
  // 构建 enable_checks 数组
  let enableChecks: string[] | null = null;
  
  if (options?.checkTypes) {
    const types: string[] = [];
    if (options.checkTypes.warning) types.push('warning');
    if (options.checkTypes.style) types.push('style');
    if (options.checkTypes.performance) types.push('performance');
    if (options.checkTypes.portability) types.push('portability');
    if (options.checkTypes.information) types.push('information');
    if (options.checkTypes.unusedFunction) types.push('unusedFunction');
    if (options.checkTypes.missingInclude) types.push('missingInclude');
    enableChecks = types.length > 0 ? types : null;  // 空数组传 null
  } else if (options?.enableChecks && options.enableChecks.length > 0) {
    enableChecks = options.enableChecks;
  }
  
  console.log('Sending to backend - enableChecks:', enableChecks, 'cppcheckOptions:', options?.cppcheckOptions);
  
  return await callPy<ProjectAnalysisResult>(
    'analyze_project_static',
    projectDir,
    options?.includePaths || null,
    enableChecks,
    options?.severity || 'warning',
    options?.cppcheckOptions || null
  );
}

/**
 * 分析单个文件
 */
export async function analyzeFile(
  projectDir: string,
  filePath: string
): Promise<FileAnalysisResult> {
  return await callPy<FileAnalysisResult>(
    'analyze_file_static',
    projectDir,
    filePath
  );
}
