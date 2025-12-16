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
    severity?: string;
  }
): Promise<ProjectAnalysisResult> {
  return await callPy<ProjectAnalysisResult>(
    'analyze_project_static',
    projectDir,
    options?.includePaths || null,
    options?.enableChecks || null,
    options?.severity || 'warning'
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
