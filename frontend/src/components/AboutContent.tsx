export function AboutContent() {
  return (
    <div className="space-y-6 text-gray-700 dark:text-gray-300">
      {/* Logo 和标题 */}
      <div className="text-center">
        <div className="w-20 h-20 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-4xl">🧪</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          SLA Qt Tester
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          智能视觉驱动的 Qt 测试平台
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full text-sm">
          <span className="text-blue-600 dark:text-blue-400">v1.0.0</span>
        </div>
      </div>

      {/* 功能介绍 */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">核心功能</h4>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">📋</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">质量管理</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                静态代码分析、单元测试、代码度量
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">视觉测试</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                实时监控、压力测试、AI 自动化
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">📁</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">项目管理</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Qt 项目扫描、文件树浏览、测试用例组织
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-white">技术栈</h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
            React 19
          </span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
            Vite
          </span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
            TailwindCSS 4
          </span>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
            Python 3.10+
          </span>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
            PyWebView
          </span>
        </div>
      </div>

      {/* 作者信息 */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-sm">
            <span>Taken by</span>
            <a 
              href="https://github.com/YueZheng-Sea-angle" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              YueZheng-Sea-angle
            </a>
            <span className="text-gray-400">·</span>
            <a 
              href="https://github.com/elecmonkey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Elecmonkey
            </a>
            <span>with</span>
            <span className="text-red-500">❤️</span>
          </div>
        </div>
      </div>

      {/* 开源信息 */}
      <div className="-mt-4 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-1 text-sm">
          <span>The project is open source on</span>
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          <a 
            href="https://github.com/SoLongAdele/sla-qt-tester" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            github.com/SoLongAdele/sla-qt-tester
          </a>
        </div>
      </div>
    </div>
  )
}
