import { invoke } from '@tauri-apps/api/core'
import type { ApiResponse } from './types'
import type { Song } from '../../types'
import { getSongs } from './song'

// 喜欢
export async function getLikedPaths(): Promise<string[]> {
  const response = await invoke<ApiResponse<string[]>>('get_liked_paths')
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function getLikedSongs(): Promise<{ songs: Song[] }> {
  const [allSongs, likedPaths] = await Promise.all([
    getSongs(),
    getLikedPaths(),
  ])
  const likedSongs = allSongs.filter(song => likedPaths.includes(song.path))
  return { songs: likedSongs }
}

export async function toggleLike(path: string, liked: boolean): Promise<void> {
  const response = await invoke<ApiResponse<void>>('toggle_like', { path, liked })
  if (!response.success) throw new Error(response.error)
}

export async function isSongLiked(path: string): Promise<boolean> {
  const response = await invoke<ApiResponse<boolean>>('is_song_liked', { path })
  if (!response.success) throw new Error(response.error)
  return response.data || false
}

// 隐藏
export async function hideSong(path: string, isAuto?: boolean): Promise<void> {
  const response = await invoke<ApiResponse<void>>('hide_song', { path, isAuto })
  if (!response.success) throw new Error(response.error)
}

export async function unhideSong(path: string): Promise<void> {
  const response = await invoke<ApiResponse<void>>('unhide_song', { path })
  if (!response.success) throw new Error(response.error)
}

export async function getHiddenPaths(): Promise<string[]> {
  const response = await invoke<ApiResponse<string[]>>('get_hidden_paths')
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function getHiddenSongs(): Promise<Song[]> {
  const response = await invoke<ApiResponse<Song[]>>('get_hidden_songs')
  if (!response.success) throw new Error(response.error)
  return response.data || []
}

export async function hideSongsBatch(paths: string[], isAuto?: boolean): Promise<number> {
  const response = await invoke<ApiResponse<number>>('hide_songs_batch', { paths, isAuto })
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

export async function unhideSongsBatch(paths: string[]): Promise<number> {
  const response = await invoke<ApiResponse<number>>('unhide_songs_batch', { paths })
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

export async function clearHiddenSongs(): Promise<number> {
  const response = await invoke<ApiResponse<number>>('clear_hidden_songs')
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

export async function getHiddenCount(): Promise<number> {
  const response = await invoke<ApiResponse<number>>('get_hidden_count')
  if (!response.success) throw new Error(response.error)
  return response.data || 0
}

export async function isSongHidden(path: string): Promise<boolean> {
  const response = await invoke<ApiResponse<boolean>>('is_song_hidden', { path })
  if (!response.success) throw new Error(response.error)
  return response.data || false
}
