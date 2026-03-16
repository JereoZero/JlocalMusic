import type { Song } from '../../types'

export type { Song }

export interface AppLog {
  id: number
  level: string
  message: string
  target?: string
  created_at: string
}

export interface Metadata {
  title?: string
  artist?: string
  album?: string
  duration: number
  bitrate?: number
  sample_rate?: number
  channels?: number
  cover?: string
}

export interface BackendPlayerState {
  state: 'Playing' | 'Paused' | 'Stopped'
  current_path?: string
  volume: number
  position: number
  duration?: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PlayHistory {
  id: number
  path: string
  played_at: string
  duration?: number
  completed?: number
  title?: string
  artist?: string
  album?: string
}

export interface LyricSource {
  type: 'embedded' | 'external'
  content: string
}

export interface ThumbnailInfo {
  small_count: number
  large_count: number
  size_bytes: number
}

export interface ScanFolderResult {
  normal_songs: Song[]
  encrypted_songs: Song[]
}
