import { useState, useEffect, useRef } from 'react'
import { codeToHtml } from 'shiki'
import type { FileNode } from '../api/qt-project'
import { readFileContent } from '../api/file'

interface FilePreviewProps {
  file: FileNode | null
  projectPath: string
  highlightLine?: number  // 单行高亮（兼容旧代码）
  highlightLines?: number[]  // 多行高亮
}

export function FilePreview({ file, highlightLine, highlightLines }: FilePreviewProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [currentHighlightLines, setCurrentHighlightLines] = useState<number[]>([])

  useEffect(() => {
    if (!file || file.type === 'directory') {
      setContent('')
      setImageData(null)
      setCurrentHighlightLines([])
      return
    }

    // 合并 highlightLine 和 highlightLines
    const linesToHighlight = highlightLines || (highlightLine ? [highlightLine] : [])
    console.log('📄 加载文件:', file.name, '目标高亮行:', linesToHighlight)
    setCurrentHighlightLines(linesToHighlight)
    loadFileContent()
  }, [file, highlightLine, highlightLines])

  // 当内容加载完成且有高亮行时，执行高亮
  useEffect(() => {
    if (content && currentHighlightLines.length > 0 && contentRef.current) {
      console.log('🎨 内容已加载，准备高亮这些行:', currentHighlightLines)
      const timer = setTimeout(() => {
        performHighlight(currentHighlightLines)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [content, currentHighlightLines])

  const loadFileContent = async () => {
    if (!file) return

    setLoading(true)
    setError('')
    setImageData(null)

    try {
      // 调用后端 API 读取文件内容
      const result = await readFileContent(file.path)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // 判断是否为图片
      if (result.is_image && result.content && result.mime_type) {
        setImageData({
          base64: result.content,
          mimeType: result.mime_type
        })
        return
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
        console.log('✅ 代码高亮渲染完成')
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
  
  // 执行高亮操作（支持多行）
  const performHighlight = (lineNumbers: number[]) => {
    if (!contentRef.current) {
      console.warn('⚠️ contentRef 不可用')
      return
    }
    
    console.log('🎯 开始高亮这些行:', lineNumbers)
    console.log('🎯 contentRef.current:', contentRef.current)
    
    // 清除之前的高亮
    const previousHighlights = contentRef.current.querySelectorAll('.highlight-active')
    previousHighlights.forEach(el => {
      el.classList.remove('highlight-active')
      const htmlEl = el as HTMLElement
      htmlEl.style.backgroundColor = ''
      htmlEl.style.borderLeftColor = ''
      htmlEl.style.borderLeftWidth = ''
      htmlEl.style.borderLeftStyle = ''
    })
    
    // 查找所有行
    const allLines = contentRef.current.querySelectorAll('[data-line]')
    console.log('📋 文档中共有', allLines.length, '行')
    
    if (allLines.length === 0) {
      console.error('❌ 文档中没有找到任何 [data-line] 元素')
      console.log('📋 contentRef innerHTML 预览:', contentRef.current.innerHTML.substring(0, 500))
      return
    }
    
    // 输出前几行的信息
    console.log('📋 前10行的行号:', Array.from(allLines).slice(0, 10).map(el => ({
      line: el.getAttribute('data-line'),
      tag: el.tagName,
      classes: el.className
    })))
    
    // 查找所有目标行
    const targetElements: HTMLElement[] = []
    
    for (const lineNum of lineNumbers) {
      // 方法1：直接选择器匹配
      let targetElement = contentRef.current.querySelector(`[data-line="${lineNum}"]`) as HTMLElement
      
      if (!targetElement) {
        // 方法2：遍历所有行进行数值匹配
        for (const el of Array.from(allLines)) {
          const dataLine = el.getAttribute('data-line')
          if (dataLine && parseInt(dataLine) === lineNum) {
            targetElement = el as HTMLElement
            console.log('✅ 通过数值匹配找到行:', dataLine)
            break
          }
        }
      } else {
        console.log('✅ 通过选择器直接找到行:', lineNum)
      }
      
      if (targetElement) {
        targetElements.push(targetElement)
      } else {
        console.error('❌ 未找到第', lineNum, '行的元素')
      }
    }
    
    if (targetElements.length > 0) {
      console.log(`✅ 找到 ${targetElements.length} 个目标行元素`)
      
      // 高亮所有目标行
      targetElements.forEach((el, index) => {
        // 添加高亮类
        el.classList.add('highlight-active')
        
        // 设置内联样式（最高优先级）
        el.style.cssText = `
          background-color: rgba(251, 191, 36, 0.3) !important;
          border-left: 4px solid #fbbf24 !important;
        `
        
        console.log(`✅ 已高亮第 ${el.getAttribute('data-line')} 行`)
      })
      
      // 滚动到第一个高亮行
      setTimeout(() => {
        targetElements[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        console.log('✅ 滚动到第一个高亮行')
      }, 100)
    } else {
      console.error('❌ 未找到任何目标行')
    }
  }

  const isCodeFile = (ext?: string): boolean => {
    if (!ext) return false
    return ['cpp', 'cc', 'cxx', 'c', 'h', 'hpp', 'hxx', 'cmake', 'pro', 'qrc', 'ui'].includes(ext)
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

  // 图片预览
  if (imageData) {
    const dataUrl = `data:${imageData.mimeType};base64,${imageData.base64}`
    
    return (
      <div className="h-full overflow-auto p-4 bg-gray-100 dark:bg-gray-900">
        <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            {file.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {file.path}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <img 
            src={dataUrl} 
            alt={file.name}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
          />
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

      <div className="flex-1 overflow-auto bg-[#0d1117]">
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
                ref={contentRef}
                className="p-4 min-w-full w-fit
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
              <pre className="p-4 text-sm text-gray-200 whitespace-pre-wrap break-words m-0 min-w-full">
                {content}
              </pre>
            )}
            {highlightLine && (
              <style>{`
                .line[data-line="${highlightLine}"],
                span.line[data-line="${highlightLine}"],
                [data-line="${highlightLine}"].line,
                .highlight-active {
                  background-color: rgba(251, 191, 36, 0.25) !important;
                  border-left-color: #fbbf24 !important;
                  border-left-width: 4px !important;
                  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.3);
                  animation: highlight-pulse 2s ease-in-out infinite;
                }
                @keyframes highlight-pulse {
                  0%, 100% { background-color: rgba(251, 191, 36, 0.25); }
                  50% { background-color: rgba(251, 191, 36, 0.4); }
                }
              `}</style>
            )}
          </>
        )}
      </div>
    </div>
  )
}
