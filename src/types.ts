export interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  path: string
  cover?: string
  play_count: number
  created_at: string
  is_liked?: boolean
}

export type ViewType = 'liked' | 'history' | 'local' | 'hidden' | 'settings'

export type PlayMode = 'list' | 'loop' | 'shuffle'

export interface PlayerState {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playMode: PlayMode
}

export interface LibraryState {
  songs: Song[]
  likedPaths: Set<string>
  hiddenPaths: Set<string>
  isLoading: boolean
}
