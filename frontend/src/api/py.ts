/**
 * PyWebView Bridge API
 * 封装所有 Python 调用
 */

// 扩展 Window 类型
declare global {
  interface Window {
    pywebview?: {
      api: {
        // 计算器 API
        add: (a: number, b: number) => Promise<number>
        subtract: (a: number, b: number) => Promise<number>
        multiply: (a: number, b: number) => Promise<number>
        divide: (a: number, b: number) => Promise<number | { error: string }>
        power: (a: number, b: number) => Promise<number>

        // 用户管理 API
        create_user: (name: string, email: string) => Promise<User | { error: string }>
        get_user: (userId: number) => Promise<User | { error: string }>
        list_users: () => Promise<User[]>
        delete_user: (userId: number) => Promise<{ success: boolean } | { error: string }>

        // 系统 API
        get_version: () => Promise<string>
        ping: () => Promise<string>
        get_system_info: () => Promise<SystemInfo>
      }
    }
  }
}

// 类型定义
export interface User {
  id: number
  name: string
  email: string
  created_at: string
}

export interface SystemInfo {
  platform: string
  platform_version: string
  python_version: string
  machine: string
}

/**
 * 通用 Python 调用函数
 */
export async function callPy<T>(fn: string, ...args: unknown[]): Promise<T> {
  if (!window.pywebview) {
    throw new Error('PyWebView API 未就绪')
  }

  const api = window.pywebview.api as unknown as Record<string, (...args: unknown[]) => Promise<T>>
  if (!api[fn]) {
    throw new Error(`Python 方法不存在: ${fn}`)
  }

  return await api[fn](...args)
}

// ==================== 计算器 API ====================

export const calculator = {
  add: (a: number, b: number) => callPy<number>('add', a, b),
  subtract: (a: number, b: number) => callPy<number>('subtract', a, b),
  multiply: (a: number, b: number) => callPy<number>('multiply', a, b),
  divide: (a: number, b: number) => callPy<number | { error: string }>('divide', a, b),
  power: (a: number, b: number) => callPy<number>('power', a, b),
}

// ==================== 用户管理 API ====================

export const users = {
  create: (name: string, email: string) => 
    callPy<User | { error: string }>('create_user', name, email),
  
  get: (userId: number) => 
    callPy<User | { error: string }>('get_user', userId),
  
  list: () => 
    callPy<User[]>('list_users'),
  
  delete: (userId: number) => 
    callPy<{ success: boolean } | { error: string }>('delete_user', userId),
}

// ==================== 系统 API ====================

export const system = {
  version: () => callPy<string>('get_version'),
  ping: () => callPy<string>('ping'),
  info: () => callPy<SystemInfo>('get_system_info'),
}

// 默认导出
export default {
  calculator,
  users,
  system,
}
