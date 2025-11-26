import { useState, useEffect } from 'react'
import { codeToHtml } from 'shiki'
import type { FileNode } from '../api/qt-project'
import { readFileContent } from '../api/file'

interface FilePreviewProps {
  file: FileNode | null
  projectPath: string
}

export function FilePreview({ file }: FilePreviewProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!file || file.type === 'directory') {
      setContent('')
      return
    }

    loadFileContent()
  }, [file])

  const loadFileContent = async () => {
    if (!file) return

    setLoading(true)
    setError('')

    try {
      // 调用后端 API 读取文件内容
      const result = await readFileContent(file.path)
      
      if (result.error) {
        throw new Error(result.error)
      }

      const text = result.content || ''
      
      // 根据文件类型处理内容
      const ext = file.name.split('.').pop()?.toLowerCase()
      
      if (isCodeFile(ext)) {
        // 代码文件使用 Shiki 高亮（带行号）
        const highlighted = await codeToHtml(text, {
          lang: getLanguage(ext),
          theme: 'github-dark',
          transformers: [
            {
              line(node, line) {
                node.properties['data-line'] = line
              }
            }
          ]
        })
        setContent(highlighted)
      } else {
        // 纯文本直接显示
        setContent(text)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取文件失败')
    } finally {
      setLoading(false)
    }
  }

  const isCodeFile = (ext?: string): boolean => {
    if (!ext) return false
    return ['cpp', 'cc', 'cxx', 'c', 'h', 'hpp', 'hxx', 'cmake', 'pro', 'qrc', 'ui'].includes(ext)
  }

  const isImageFile = (ext?: string): boolean => {
    if (!ext) return false
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp', 'ico'].includes(ext)
  }

  const getLanguage = (ext?: string): string => {
    if (!ext) return 'text'
    
    const langMap: Record<string, string> = {
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'h': 'cpp',
      'hpp': 'cpp',
      'hxx': 'cpp',
      'cmake': 'cmake',
      'pro': 'makefile',
      'qrc': 'xml',
      'ui': 'xml',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'txt': 'text',
    }
    
    return langMap[ext] || 'text'
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-sm">选择一个文件以预览</div>
        </div>
      </div>
    )
  }

  if (file.type === 'directory') {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📁</div>
          <div className="text-sm">无法预览文件夹</div>
        </div>
      </div>
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase()

  // 图片预览（需要通过后端读取）
  if (isImageFile(ext)) {
    return (
      <div className="h-full overflow-auto p-4">
        <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            {file.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {file.path}
          </p>
        </div>
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🖼️</div>
            <div className="text-sm">图片预览功能开发中</div>
            <div className="text-xs mt-1">文件路径: {file.path}</div>
          </div>
        </div>
      </div>
    )
  }

  // 文本/代码预览
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          {file.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {file.path}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-sm">加载中...</div>
          </div>
        )}

        {error && (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        {!loading && !error && content && (
          <>
            {isCodeFile(ext) ? (
              <div 
                className="p-4 bg-[#0d1117] min-w-full w-fit
                  [&_.shiki]:!bg-transparent [&_.shiki]:!m-0 [&_.shiki]:!p-0
                  [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!bg-transparent
                  [&_code]:grid [&_code]:text-sm
                  [&_code_.line]:border-l-2 [&_code_.line]:border-transparent [&_code_.line]:pl-2
                  [&_code_.line:hover]:bg-white/5 [&_code_.line:hover]:border-l-blue-500
                  [&_code_.line]:relative
                  [&_code_.line::before]:content-[attr(data-line)] [&_code_.line::before]:inline-block 
                  [&_code_.line::before]:w-10 [&_code_.line::before]:mr-3 [&_code_.line::before]:text-right 
                  [&_code_.line::before]:text-gray-500 [&_code_.line::before]:select-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <pre className="p-4 bg-[#0d1117] text-sm text-gray-200 whitespace-pre-wrap break-words m-0 min-w-full">
                {content}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  )
}
