/**
 * 静态代码分析面板
 * 使用 cppcheck 进行静态代码分析
 */
import { useState, useEffect } from 'react';
import {
  checkCppcheckStatus,
  installCppcheck,
  analyzeProject,
  type CppcheckStatus,
  type ProjectAnalysisResult,
  type CodeIssue,
} from '../api/static-analysis';

interface StaticAnalysisPanelProps {
  projectPath: string;
}

type ViewTab = 'severity' | 'category';

export default function StaticAnalysisPanel({ projectPath }: StaticAnalysisPanelProps) {
  const [cppcheckStatus, setCppcheckStatus] = useState<CppcheckStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<CodeIssue | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('severity');

  // 检查 cppcheck 状态
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const status = await checkCppcheckStatus();
      setCppcheckStatus(status);
    } catch (error) {
      console.error('检查 cppcheck 状态失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // 安装 cppcheck
  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const result = await installCppcheck();
      if (result.success) {
        alert(result.message);
        await checkStatus(); // 重新检查状态
      } else {
        alert(`安装失败: ${result.message}`);
      }
    } catch (error) {
      console.error('安装 cppcheck 失败:', error);
      alert(`安装失败: ${error}`);
    } finally {
      setIsInstalling(false);
    }
  };

  // 运行分析
  const handleAnalyze = async () => {
    if (!cppcheckStatus?.installed) {
      alert('请先安装 cppcheck');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSelectedIssue(null);

    try {
      const result = await analyzeProject(projectPath);
      setAnalysisResult(result);
      
      if (!result.success) {
        alert(`分析失败: ${result.message}`);
      }
    } catch (error) {
      console.error('分析失败:', error);
      alert(`分析失败: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 组件挂载时检查状态
  useEffect(() => {
    checkStatus();
  }, []);

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'style':
        return 'text-blue-600';
      case 'performance':
        return 'text-purple-600';
      case 'portability':
        return 'text-teal-600';
      default:
        return 'text-gray-600';
    }
  };

  // 获取严重程度背景色
  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'style':
        return 'bg-blue-50 border-blue-200';
      case 'performance':
        return 'bg-purple-50 border-purple-200';
      case 'portability':
        return 'bg-teal-50 border-teal-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">静态代码分析</h2>
          
          {/* Cppcheck 状态 */}
          {cppcheckStatus && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cppcheckStatus.installed ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                {cppcheckStatus.installed ? cppcheckStatus.version : '未安装'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 刷新状态按钮 */}
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            {isChecking ? '检查中...' : '刷新状态'}
          </button>

          {/* 安装按钮 */}
          {cppcheckStatus && !cppcheckStatus.installed && (
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {isInstalling ? '安装中...' : '安装 Cppcheck'}
            </button>
          )}

          {/* 运行分析按钮 */}
          <button
            onClick={handleAnalyze}
            disabled={!cppcheckStatus?.installed || isAnalyzing}
            className="px-4 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? '分析中...' : '运行分析'}
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {isAnalyzing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">正在分析代码...</p>
            </div>
          </div>
        ) : analysisResult ? (
          <div className="flex h-full">
            {/* 问题列表 */}
            <div className="w-1/2 border-r overflow-y-auto">
              {/* 统计信息 */}
              {analysisResult.statistics && (
                <div className="p-4 bg-white border-b">
                  <div className="grid grid-cols-4 gap-3 text-center mb-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{analysisResult.statistics.files_checked}</div>
                      <div className="text-xs text-gray-500">文件数</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{analysisResult.statistics.error_count || 0}</div>
                      <div className="text-xs text-gray-500">错误</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{analysisResult.statistics.warning_count || 0}</div>
                      <div className="text-xs text-gray-500">警告</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{analysisResult.statistics.category_count || 0}</div>
                      <div className="text-xs text-gray-500">问题类型</div>
                    </div>
                  </div>
                  
                  {/* 严重程度详细统计 */}
                  {analysisResult.statistics.severity_stats && (
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(analysisResult.statistics.severity_stats).map(([severity, count]) => (
                        count > 0 && (
                          <div key={severity} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100">
                            <span className={getSeverityColor(severity)}>{severity}</span>: {count}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* 视图切换标签 */}
              <div className="flex border-b bg-white">
                <button
                  onClick={() => setViewTab('severity')}
                  className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    viewTab === 'severity'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  按严重程度
                </button>
                <button
                  onClick={() => setViewTab('category')}
                  className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    viewTab === 'category'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  按问题类型
                </button>
              </div>

              {/* 按严重程度显示 */}
              {viewTab === 'severity' && (
                <>
                  {/* 错误列表 */}
                  {analysisResult.errors && analysisResult.errors.length > 0 && (
                    <div className="p-4 border-b bg-white">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">错误 ({analysisResult.errors.length})</h3>
                      <div className="space-y-2">
                        {analysisResult.errors.map((issue, idx) => (
                          <div
                            key={`error-${idx}`}
                            onClick={() => setSelectedIssue(issue)}
                            className={`p-3 border rounded cursor-pointer hover:shadow-md transition-shadow ${
                              getSeverityBgColor(issue.severity)
                            } ${selectedIssue === issue ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className={`text-xs font-semibold uppercase ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 font-medium">{issue.message}</p>
                                {issue.locations && issue.locations[0] && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {issue.locations[0].file}:{issue.locations[0].line}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 警告列表 */}
                  {analysisResult.warnings && analysisResult.warnings.length > 0 && (
                    <div className="p-4 bg-white">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">警告 ({analysisResult.warnings.length})</h3>
                      <div className="space-y-2">
                        {analysisResult.warnings.map((issue, idx) => (
                          <div
                            key={`warning-${idx}`}
                            onClick={() => setSelectedIssue(issue)}
                            className={`p-3 border rounded cursor-pointer hover:shadow-md transition-shadow ${
                              getSeverityBgColor(issue.severity)
                            } ${selectedIssue === issue ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className={`text-xs font-semibold uppercase ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800">{issue.message}</p>
                                {issue.locations && issue.locations[0] && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {issue.locations[0].file}:{issue.locations[0].line}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* 按问题类型显示 */}
              {viewTab === 'category' && analysisResult.categories && (
                <div className="p-4 bg-white">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">问题类型统计 ({analysisResult.categories.length})</h3>
                  <div className="space-y-3">
                    {analysisResult.categories.map((category, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <div className={`p-3 ${getSeverityBgColor(category.severity)} border-b`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase ${getSeverityColor(category.severity)}`}>
                                {category.severity}
                              </span>
                              <span className="font-mono text-sm font-semibold text-gray-800">{category.id}</span>
                            </div>
                            <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-700">
                              {category.count} 个
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{category.message}</p>
                        </div>
                        <div className="p-2 bg-gray-50 max-h-40 overflow-y-auto">
                          {category.issues.map((issue, issueIdx) => (
                            <div
                              key={issueIdx}
                              onClick={() => setSelectedIssue(issue)}
                              className={`p-2 mb-1 bg-white rounded cursor-pointer hover:shadow-sm transition-shadow ${
                                selectedIssue === issue ? 'ring-2 ring-blue-500' : ''
                              }`}
                            >
                              {issue.locations && issue.locations[0] && (
                                <p className="text-xs text-gray-600 font-mono">
                                  {issue.locations[0].file}:{issue.locations[0].line}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 无问题 */}
              {viewTab === 'severity' && (!analysisResult.errors || analysisResult.errors.length === 0) &&
                (!analysisResult.warnings || analysisResult.warnings.length === 0) && (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">代码质量良好</p>
                    <p className="text-sm mt-2">未发现任何问题</p>
                  </div>
                )}
            </div>

            {/* 问题详情 */}
            <div className="w-1/2 overflow-y-auto bg-white">
              {selectedIssue ? (
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold uppercase rounded ${getSeverityColor(selectedIssue.severity)}`}>
                        {selectedIssue.severity}
                      </span>
                      <span className="text-xs text-gray-500">ID: {selectedIssue.id}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">{selectedIssue.message}</h3>
                  </div>

                  {selectedIssue.verbose && selectedIssue.verbose !== selectedIssue.message && (
                    <div className="mb-4 p-4 bg-gray-50 rounded border">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">详细说明</h4>
                      <p className="text-sm text-gray-600">{selectedIssue.verbose}</p>
                    </div>
                  )}

                  {selectedIssue.locations && selectedIssue.locations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">问题位置</h4>
                      <div className="space-y-2">
                        {selectedIssue.locations.map((loc, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border">
                            <p className="text-sm font-mono text-gray-800">{loc.file}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              行 {loc.line}, 列 {loc.column}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>选择一个问题查看详情</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p>点击"运行分析"开始静态代码分析</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
