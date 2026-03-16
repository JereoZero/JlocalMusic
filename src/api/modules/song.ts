import { invoke } from '@tauri-apps/api/core'
import type { ApiResponse, ScanFolderResult } from './types'
import type { Song } from '../../types'

export async function getSongs(): Promise<Song[]> {
  const response = await invoke<ApiResponse<Song[]>>('get_songs')
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function searchSongs(query: string): Promise<Song[]> {
  const response = await invoke<ApiResponse<Song[]>>('search_songs', { query })
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function scanFolder(path: string): Promise<ScanFolderResult> {
  const response = await invoke<ApiResponse<ScanFolderResult>>('scan_folder', { path })
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function deleteSong(path: string): Promise<void> {
  const response = await invoke<ApiResponse<void>>('delete_song', { path })
  if (!response.success) throw new Error(response.error)
}

export async function getSongCover(path: string): Promise<string | null> {
  const response = await invoke<ApiResponse<string | null>>('get_song_cover', { path })
  if (!response.success) throw new Error(response.error)
  return response.data ?? null
}

export async function getSongCoverLarge(path: string): Promise<string | null> {
  const response = await invoke<ApiResponse<string | null>>('get_song_cover_large', { path })
  if (!response.success) throw new Error(response.error)
  return response.data ?? null
}

export async function getSongCoverFull(path: string): Promise<string | null> {
  const response = await invoke<ApiResponse<string | null>>('get_song_cover_full', { path })
  if (!response.success) throw new Error(response.error)
  return response.data ?? null
}

export async function getSongCoversBatch(paths: string[]): Promise<Map<string, string | null>> {
  const response = await invoke<ApiResponse<Record<string, string | null>>>('get_song_covers_batch', { paths })
  if (!response.success) throw new Error(response.error)
  return new Map(Object.entries(response.data || {}))
}

export async function getThumbnailInfo() {
  const response = await invoke<ApiResponse<{ small_count: number; large_count: number; size_bytes: number }>>('get_thumbnail_info')
  if (!response.success) throw new Error(response.error)
  return response.data!
}
