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
  type CppcheckOptions,
  type CheckTypeOptions,
} from '../api/static-analysis';

interface StaticAnalysisPanelProps {
  projectPath: string;
  onOpenFile?: (filePath: string, lines: number | number[]) => void;  // 打开文件回调（支持多行）
}

type ViewTab = 'severity' | 'category';

export default function StaticAnalysisPanel({ projectPath, onOpenFile }: StaticAnalysisPanelProps) {
  const [cppcheckStatus, setCppcheckStatus] = useState<CppcheckStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<CodeIssue | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('severity');
  const [showOptions, setShowOptions] = useState(false);
  
  // Cppcheck 参数选项
  const [cppcheckOptions, setCppcheckOptions] = useState<CppcheckOptions>({
    inconclusive: false,
    jobs: 1,
    max_configs: 12,
    platform: '',
    std: '',
  });
  
  // 检查类型选项
  const [checkTypes, setCheckTypes] = useState<CheckTypeOptions>({
    warning: true,
    style: true,
    performance: true,
    portability: true,
    information: true,
    unusedFunction: false,
    missingInclude: false,
  });

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
      // 构建选项，过滤空值
      const options = {
        checkTypes: checkTypes,
        cppcheckOptions: {
          inconclusive: cppcheckOptions.inconclusive || undefined,
          jobs: cppcheckOptions.jobs && cppcheckOptions.jobs > 1 ? cppcheckOptions.jobs : undefined,
          max_configs: cppcheckOptions.max_configs && cppcheckOptions.max_configs !== 12 ? cppcheckOptions.max_configs : undefined,
          platform: cppcheckOptions.platform || undefined,
          std: cppcheckOptions.std || undefined,
        },
      };
      
      // 调试输出
      console.log('分析参数:', options);
      
      const result = await analyzeProject(projectPath, options);
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

  // 打开文件并跳转到指定行（高亮所有相关行）
  const handleOpenFile = (issue: CodeIssue) => {
    if (!issue.locations || issue.locations.length === 0) {
      alert('该问题没有位置信息');
      return;
    }

    if (!onOpenFile) {
      alert('文件预览功能不可用');
      return;
    }

    // 获取第一个位置的文件路径
    const primaryFile = issue.locations[0].file;
    
    // 收集同一文件中的所有行号
    const linesInFile = issue.locations
      .filter(loc => loc.file === primaryFile)
      .map(loc => loc.line);
    
    console.log('📍 打开文件并高亮行:', primaryFile, linesInFile);
    onOpenFile(primaryFile, linesInFile);
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

          {/* 参数配置按钮 */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              showOptions 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {showOptions ? '隐藏参数' : '配置参数'}
          </button>

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

      {/* Cppcheck 参数配置面板 */}
      {showOptions && (
        <div className="max-h-[60vh] overflow-y-auto p-4 bg-white border-b">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Cppcheck 参数配置</h3>
          
          {/* 检查类别选择 */}
          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🔍 检查类别选择</h4>
            <div className="text-xs text-gray-600 mb-2">
              ℹ️ <strong>检查类别</strong> 控制 cppcheck 检查哪些类型的问题，结果中的 <strong>严重程度</strong> (error/warning/style/...) 由 cppcheck 自动判定
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.warning}
                  onChange={(e) => setCheckTypes({ ...checkTypes, warning: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">warning</span>
                  <span className="text-xs text-gray-500 block">常规警告级别检查（默认）</span>
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.style}
                  onChange={(e) => setCheckTypes({ ...checkTypes, style: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">style</span>
                  <span className="text-xs text-gray-500 block">代码风格和编码规范</span>
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.performance}
                  onChange={(e) => setCheckTypes({ ...checkTypes, performance: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">performance</span>
                  <span className="text-xs text-gray-500 block">性能优化建议</span>
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.portability}
                  onChange={(e) => setCheckTypes({ ...checkTypes, portability: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">portability</span>
                  <span className="text-xs text-gray-500 block">跨平台兼容性</span>
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.information}
                  onChange={(e) => setCheckTypes({ ...checkTypes, information: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">information</span>
                  <span className="text-xs text-gray-500 block">信息性消息</span>
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.unusedFunction}
                  onChange={(e) => setCheckTypes({ ...checkTypes, unusedFunction: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">unusedFunction</span>
                  <span className="text-xs text-gray-500 block">未使用函数（较慢）</span>
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkTypes.missingInclude}
                  onChange={(e) => setCheckTypes({ ...checkTypes, missingInclude: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">missingInclude</span>
                  <span className="text-xs text-gray-500 block">缺失头文件（较慢）</span>
                </span>
              </label>
              
              <div className="col-span-2 flex gap-2 pt-2 border-t border-blue-200">
                <button
                  onClick={() => setCheckTypes({
                    warning: true,
                    style: true,
                    performance: true,
                    portability: true,
                    information: true,
                    unusedFunction: true,
                    missingInclude: true,
                  })}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  全选
                </button>
                <button
                  onClick={() => setCheckTypes({
                    warning: false,
                    style: false,
                    performance: false,
                    portability: false,
                    information: false,
                    unusedFunction: false,
                    missingInclude: false,
                  })}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  全不选
                </button>
                <button
                  onClick={() => setCheckTypes({
                    warning: true,
                    style: true,
                    performance: true,
                    portability: true,
                    information: true,
                    unusedFunction: false,
                    missingInclude: false,
                  })}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  推荐配置
                </button>
              </div>
            </div>
          </div>
          
          {/* 其他参数 */}
          <h4 className="text-sm font-semibold text-gray-700 mb-2">⚙️ 高级参数</h4>
          <div className="grid grid-cols-2 gap-4">
            {/* 不确定性检查 */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inconclusive"
                  checked={cppcheckOptions.inconclusive}
                  onChange={(e) => setCppcheckOptions({ ...cppcheckOptions, inconclusive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="inconclusive" className="text-sm text-gray-700">
                  <strong>--inconclusive</strong> 不确定性检查
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6 mt-1">
                启用可能不确定的检查。cppcheck 对某些问题无法 100% 确定是否为 bug，启用此选项会报告这些不确定的问题（可能产生误报）
              </p>
            </div>

            {/* 并行线程数 */}
            <div className="flex items-center gap-2">
              <label htmlFor="jobs" className="text-sm text-gray-700 whitespace-nowrap">
                并行线程数:
              </label>
              <input
                type="number"
                id="jobs"
                min="1"
                max="16"
                value={cppcheckOptions.jobs}
                onChange={(e) => setCppcheckOptions({ ...cppcheckOptions, jobs: parseInt(e.target.value) || 1 })}
                className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 最大配置数 */}
            <div className="flex items-center gap-2">
              <label htmlFor="max_configs" className="text-sm text-gray-700 whitespace-nowrap">
                最大配置数:
              </label>
              <input
                type="number"
                id="max_configs"
                min="1"
                max="100"
                value={cppcheckOptions.max_configs}
                onChange={(e) => setCppcheckOptions({ ...cppcheckOptions, max_configs: parseInt(e.target.value) || 12 })}
                className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 目标平台 */}
            <div className="flex items-center gap-2">
              <label htmlFor="platform" className="text-sm text-gray-700 whitespace-nowrap">
                目标平台:
              </label>
              <select
                id="platform"
                value={cppcheckOptions.platform}
                onChange={(e) => setCppcheckOptions({ ...cppcheckOptions, platform: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">自动检测</option>
                <option value="unix32">Unix 32-bit</option>
                <option value="unix64">Unix 64-bit</option>
                <option value="win32A">Windows 32-bit ANSI</option>
                <option value="win32W">Windows 32-bit Unicode</option>
                <option value="win64">Windows 64-bit</option>
              </select>
            </div>

            {/* C++ 标准 */}
            <div className="flex items-center gap-2 col-span-2">
              <label htmlFor="std" className="text-sm text-gray-700 whitespace-nowrap">
                C++ 标准:
              </label>
              <select
                id="std"
                value={cppcheckOptions.std}
                onChange={(e) => setCppcheckOptions({ ...cppcheckOptions, std: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">自动检测</option>
                <option value="c++11">C++11</option>
                <option value="c++14">C++14</option>
                <option value="c++17">C++17</option>
                <option value="c++20">C++20</option>
                <option value="c++23">C++23</option>
              </select>
            </div>
          </div>
          
          {/* 参数说明 */}
          <div className="mt-3 p-3 bg-blue-50 rounded text-xs text-gray-600">
            <p className="font-semibold mb-1">💡 参数说明:</p>
            <div className="mb-2 pb-2 border-b border-blue-200">
              <p className="font-semibold text-blue-800">检查类别 vs 严重程度：</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li><strong>检查类别</strong>：上面选择的选项，控制 cppcheck 检查哪些类型的问题</li>
                <li><strong>严重程度</strong>：结果中显示的 error/warning/style 等，由 cppcheck 自动判定</li>
              </ul>
            </div>
            <p className="font-semibold text-blue-800 mb-1">高级参数说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>不确定检查 (--inconclusive):</strong> 报告 cppcheck 无法 100% 确定的问题。建议关闭以减少误报</li>
              <li><strong>并行线程数 (-j):</strong> 使用多线程加速检查，建议设置为 CPU 核心数（如 4 或 8）</li>
              <li><strong>最大配置数 (--max-configs):</strong> 限制每个文件检查的配置数量，减少检查时间但可能遗漏问题</li>
              <li><strong>目标平台 (--platform):</strong> 指定代码的目标平台，影响 int/long 等类型的大小判断</li>
              <li><strong>C++ 标准 (--std):</strong> 指定使用的 C++ 标准版本，影响语法和库检查</li>
            </ul>
          </div>
        </div>
      )}

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
                            onDoubleClick={() => handleOpenFile(issue)}
                            className={`p-3 border rounded cursor-pointer hover:shadow-md transition-shadow ${
                              getSeverityBgColor(issue.severity)
                            } ${selectedIssue === issue ? 'ring-2 ring-blue-500' : ''}`}
                            title="双击跳转到代码位置"
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
                            onDoubleClick={() => handleOpenFile(issue)}
                            className={`p-3 border rounded cursor-pointer hover:shadow-md transition-shadow ${
                              getSeverityBgColor(issue.severity)
                            } ${selectedIssue === issue ? 'ring-2 ring-blue-500' : ''}`}
                            title="双击跳转到代码位置"
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
                              onDoubleClick={() => handleOpenFile(issue)}
                              className={`p-2 mb-1 bg-white rounded cursor-pointer hover:shadow-sm transition-shadow ${
                                selectedIssue === issue ? 'ring-2 ring-blue-500' : ''
                              }`}
                              title="双击跳转到代码位置"
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
                          <div key={idx} className="p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono text-gray-800 truncate" title={loc.file}>{loc.file}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  行 {loc.line}, 列 {loc.column}
                                </p>
                              </div>
                              <button
                                onClick={() => handleOpenFile(selectedIssue)}
                                className="flex-shrink-0 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="在编辑器中打开"
                              >
                                跳转
                              </button>
                            </div>
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
