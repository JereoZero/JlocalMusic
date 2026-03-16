// API 入口
// 检测运行环境并导出对应的 API 实现

import * as realApi from './modules'
import { mockApi } from './mock-api'

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

const api = isTauri ? realApi : mockApi

export default api
export * from './modules'
