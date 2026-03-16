import { invoke } from '@tauri-apps/api/core'
import type { ApiResponse, BackendPlayerState, Metadata } from './types'
import type { Song } from '../../types'

export async function playSong(path: string): Promise<void> {
  const response = await invoke<ApiResponse<void>>('play_song', { path })
  if (!response.success) throw new Error(response.error)
}

export async function pauseSong(): Promise<void> {
  const response = await invoke<ApiResponse<void>>('pause_song')
  if (!response.success) throw new Error(response.error)
}

export async function resumeSong(): Promise<void> {
  const response = await invoke<ApiResponse<void>>('resume_song')
  if (!response.success) throw new Error(response.error)
}

export async function stopSong(): Promise<void> {
  const response = await invoke<ApiResponse<void>>('stop_song')
  if (!response.success) throw new Error(response.error)
}

export async function seekSong(time: number): Promise<void> {
  const response = await invoke<ApiResponse<void>>('seek_song', { time })
  if (!response.success) throw new Error(response.error)
}

export async function setVolume(volume: number): Promise<void> {
  const response = await invoke<ApiResponse<void>>('set_volume', { volume })
  if (!response.success) throw new Error(response.error)
}

export async function playNext(currentPath: string, mode: string): Promise<Song> {
  const response = await invoke<ApiResponse<Song>>('play_next', { currentPath, mode })
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function playPrev(currentPath: string, mode: string): Promise<Song> {
  const response = await invoke<ApiResponse<Song>>('play_prev', { currentPath, mode })
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function getPlayerState(): Promise<BackendPlayerState> {
  const response = await invoke<ApiResponse<BackendPlayerState>>('get_player_state')
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function getMetadata(path: string): Promise<Metadata> {
  const response = await invoke<ApiResponse<Metadata>>('get_metadata', { path })
  if (!response.success) throw new Error(response.error)
  return response.data!
}

export async function getMetadataBatch(paths: string[]): Promise<Array<{ path: string; metadata: Metadata }>> {
  const response = await invoke<ApiResponse<Array<{ path: string; metadata: Metadata }>>>('get_metadata_batch', { paths })
  if (!response.success) throw new Error(response.error)
  return response.data || []
}
