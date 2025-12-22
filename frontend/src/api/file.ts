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
        is_image?: boolean
        mime_type?: string
      }>
      open_file_at_line: (filePath: string, line: number, column?: number) => Promise<{
        success: boolean
        message?: string
        error?: string
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

/**
 * 在 VS Code 中打开文件并跳转到指定行列
 */
export async function openFileAtLine(
  filePath: string,
  line: number,
  column: number = 1
) {
  if (!window.pywebview || !window.pywebview.api) {
    throw new Error('PyWebView API 未初始化')
  }
  return await window.pywebview.api.open_file_at_line(filePath, line, column)
}
