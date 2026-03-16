import { invoke } from '@tauri-apps/api/core'
import type { ApiResponse } from './types'

export async function getSetting(key: string): Promise<string | null> {
  const response = await invoke<ApiResponse<string | null>>('get_setting', { key })
  if (!response.success) throw new Error(response.error)
  return response.data ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const response = await invoke<ApiResponse<void>>('set_setting', { key, value })
  if (!response.success) throw new Error(response.error)
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const response = await invoke<ApiResponse<Array<[string, string]>>>('get_all_settings')
  if (!response.success) throw new Error(response.error)
  return Object.fromEntries(response.data || [])
}

export async function getAudioFile(path: string): Promise<string> {
  const response = await invoke<ApiResponse<string>>('get_audio_file', { path })
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function checkFileExists(path: string): Promise<boolean> {
  const response = await invoke<ApiResponse<boolean>>('check_file_exists', { path })
  if (!response.success) throw new Error(response.error)
  return response.data || false
}

export async function selectFolder(): Promise<string | null> {
  const response = await invoke<ApiResponse<string | null>>('select_folder')
  if (!response.success) throw new Error(response.error)
  return response.data ?? null
}

export async function getPrimaryMusicFolder(): Promise<string> {
  const response = await invoke<ApiResponse<string>>('get_primary_music_folder')
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function addSecondaryFolder(targetPath: string): Promise<string> {
  const response = await invoke<ApiResponse<string>>('add_secondary_folder', { targetPath })
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function removeSecondaryFolder(linkName: string): Promise<void> {
  const response = await invoke<ApiResponse<void>>('remove_secondary_folder', { linkName })
  if (!response.success) throw new Error(response.error)
}

export async function getSecondaryFolders(): Promise<Array<{ name: string; target: string }>> {
  const response = await invoke<ApiResponse<Array<[string, string]>>>('get_secondary_folders')
  if (!response.success) throw new Error(response.error)
  return (response.data || []).map(([name, target]) => ({ name, target }))
}

export async function cleanupNonexistentSongs(baseFolder: string): Promise<number> {
  const response = await invoke<ApiResponse<number>>('cleanup_nonexistent_songs', { baseFolder })
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}
