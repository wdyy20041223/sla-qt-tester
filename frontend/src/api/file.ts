/**
 * 文件相关 API
 */

declare const window: {
  pywebview: {
    api: {
      read_file_content: (filePath: string) => Promise<{
        content: string | null
        size?: number
        error: string | null
        is_binary?: boolean
      }>
    }
  }
}

/**
 * 读取文件内容
 */
export async function readFileContent(filePath: string) {
  if (!window.pywebview || !window.pywebview.api) {
    throw new Error('PyWebView API 未初始化')
  }
  return await window.pywebview.api.read_file_content(filePath)
}
