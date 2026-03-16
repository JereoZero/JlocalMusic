import { invoke } from '@tauri-apps/api/core'
import type { ApiResponse, AppLog, PlayHistory, LyricSource } from './types'

// 日志
export async function addLog(level: string, message: string, target?: string): Promise<void> {
  const response = await invoke<ApiResponse<void>>('add_log', { level, message, target })
  if (!response.success) throw new Error(response.error)
}

export async function getLogs(level?: string, limit?: number): Promise<AppLog[]> {
  const response = await invoke<ApiResponse<AppLog[]>>('get_logs', { level, limit })
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function getErrorLogs(): Promise<AppLog[]> {
  const response = await invoke<ApiResponse<AppLog[]>>('get_error_logs')
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function clearLogs(): Promise<number> {
  const response = await invoke<ApiResponse<number>>('clear_logs')
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

export async function getLogCount(): Promise<number> {
  const response = await invoke<ApiResponse<number>>('get_log_count')
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

export async function copyLogsToClipboard(): Promise<string> {
  const response = await invoke<ApiResponse<string>>('copy_logs_to_clipboard')
  if (!response.success) throw new Error(response.error)
  return response.data || ''
}

// 播放历史
export async function addPlayHistory(path: string, duration: number, completed: boolean): Promise<void> {
  const response = await invoke<ApiResponse<void>>('add_play_history', { path, duration, completed })
  if (!response.success) throw new Error(response.error)
}

export async function getPlayHistory(limit?: number): Promise<PlayHistory[]> {
  const response = await invoke<ApiResponse<PlayHistory[]>>('get_play_history', { limit })
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function clearPlayHistory(): Promise<void> {
  const response = await invoke<ApiResponse<void>>('clear_play_history')
  if (!response.success) throw new Error(response.error)
}

export async function getPlayCounts(): Promise<Record<string, number>> {
  const response = await invoke<ApiResponse<Array<[string, number]>>>('get_play_counts')
  if (!response.success) throw new Error(response.error)
  return Object.fromEntries(response.data || [])
}

export async function getSongPlayCount(path: string): Promise<number> {
  const response = await invoke<ApiResponse<number>>('get_song_play_count', { path })
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

// 歌词
export async function getLyrics(path: string): Promise<LyricSource | null> {
  const response = await invoke<ApiResponse<LyricSource | null>>('get_lyrics', { path })
  if (!response.success) throw new Error(response.error)
  return response.data ?? null
}
