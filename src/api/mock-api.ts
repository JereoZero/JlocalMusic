// 模拟 API 用于网页端测试
import type { Song, PlayHistory, AppLog } from './modules/types'
import { APP_CONFIG } from '../config'

const mockSongs: Song[] = [
  {
    id: '1',
    title: '测试歌曲 1',
    artist: '测试歌手 A',
    album: '测试专辑 X',
    duration: 245,
    path: '/music/test1.mp3',
    play_count: 10,
    created_at: new Date().toISOString(),
    is_liked: true,
  },
  {
    id: '2',
    title: '测试歌曲 2',
    artist: '测试歌手 B',
    album: '测试专辑 Y',
    duration: 198,
    path: '/music/test2.mp3',
    play_count: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: '测试歌曲 3',
    artist: '测试歌手 A',
    album: '测试专辑 X',
    duration: 312,
    path: '/music/test3.mp3',
    play_count: 3,
    created_at: new Date().toISOString(),
    is_liked: true,
  },
  {
    id: '4',
    title: '测试歌曲 4',
    artist: '测试歌手 C',
    album: '测试专辑 Z',
    duration: 276,
    path: '/music/test4.mp3',
    play_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: '测试歌曲 5',
    artist: '测试歌手 B',
    album: '测试专辑 Y',
    duration: 189,
    path: '/music/test5.mp3',
    play_count: 8,
    created_at: new Date().toISOString(),
  },
]

const mockPlayHistory: PlayHistory[] = [
  {
    id: 1,
    path: '/music/test1.mp3',
    played_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    duration: 245,
    completed: 1,
    title: '测试歌曲 1',
    artist: '测试歌手 A',
    album: '测试专辑 X',
  },
  {
    id: 2,
    path: '/music/test3.mp3',
    played_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    duration: 312,
    completed: 1,
    title: '测试歌曲 3',
    artist: '测试歌手 A',
    album: '测试专辑 X',
  },
  {
    id: 3,
    path: '/music/test2.mp3',
    played_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    duration: 198,
    completed: 0,
    title: '测试歌曲 2',
    artist: '测试歌手 B',
    album: '测试专辑 Y',
  },
]

const mockLikedPaths = new Set(['/music/test1.mp3', '/music/test3.mp3'])
const mockHiddenPaths = new Set<string>([])

export const mockApi = {
  // 歌曲相关
  getSongs: async (): Promise<Song[]> => mockSongs,
  
  searchSongs: async (query: string): Promise<Song[]> => {
    const q = query.toLowerCase()
    return mockSongs.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q)
    )
  },
  
  deleteSong: async (path: string): Promise<void> => {
    console.warn('Mock: delete song', path)
  },
  
  getSongCover: async (_path: string): Promise<string | null> => {
    return null
  },

  getSongCoverLarge: async (_path: string): Promise<string | null> => {
    return null
  },

  getSongCoverFull: async (_path: string): Promise<string | null> => {
    return null
  },

  getSongCoversBatch: async (paths: string[]): Promise<Map<string, string | null>> => {
    const result = new Map<string, string | null>()
    paths.forEach(p => result.set(p, null))
    return result
  },
  
  // 喜欢相关
  getLikedPaths: async (): Promise<string[]> => Array.from(mockLikedPaths),
  
  getLikedSongs: async (): Promise<{ songs: typeof mockSongs }> => {
    const likedPaths = Array.from(mockLikedPaths)
    return { songs: mockSongs.filter(s => likedPaths.includes(s.path)) }
  },
  
  toggleLike: async (path: string, liked: boolean): Promise<void> => {
    if (liked) mockLikedPaths.add(path)
    else mockLikedPaths.delete(path)
  },
  
  // 隐藏相关
  getHiddenPaths: async (): Promise<string[]> => Array.from(mockHiddenPaths),
  
  hideSong: async (path: string): Promise<void> => {
    mockHiddenPaths.add(path)
  },
  
  unhideSong: async (path: string): Promise<void> => {
    mockHiddenPaths.delete(path)
  },
  
  // 播放历史
  getPlayHistory: async (limit?: number): Promise<PlayHistory[]> => {
    return mockPlayHistory.slice(0, limit || 100)
  },
  
  addPlayHistory: async (path: string, _duration: number, _completed: boolean): Promise<void> => {
    console.warn('Mock: add play history', path)
  },
  
  clearPlayHistory: async (): Promise<void> => {
    console.warn('Mock: clear play history')
  },
  
  // 扫描
  scanFolder: async (folder: string): Promise<number> => {
    console.warn('Mock: scan folder', folder)
    return mockSongs.length
  },
  
  selectFolder: async (): Promise<string | null> => '/mock/music/folder',
  
  // 日志
  getLogs: async (): Promise<AppLog[]> => [],
  clearLogs: async (): Promise<void> => {},
  copyLogsToClipboard: async (): Promise<void> => {},
  
  // 歌词
  getLyrics: async (_path: string): Promise<import('./modules/types').LyricSource | null> => {
    return {
      content: `[00:00.00]这是第一句歌词
[00:05.00]这是第二句歌词
[00:10.00]这是第三句歌词
[00:15.00]这是第四句歌词
[00:20.00]这是第五句歌词`,
      type: 'embedded',
    }
  },

  // 缩略图
  getThumbnailInfo: async (): Promise<import('./modules/types').ThumbnailInfo> => {
    return { small_count: 10, large_count: 5, size_bytes: 102400 }
  },

  // 播放控制
  playSong: async (path: string): Promise<void> => {
    console.warn('Mock: play song', path)
  },

  pauseSong: async (): Promise<void> => {
    console.warn('Mock: pause song')
  },

  resumeSong: async (): Promise<void> => {
    console.warn('Mock: resume song')
  },

  stopSong: async (): Promise<void> => {
    console.warn('Mock: stop song')
  },

  seekSong: async (time: number): Promise<void> => {
    console.warn('Mock: seek to', time)
  },

  setVolume: async (volume: number): Promise<void> => {
    console.warn('Mock: set volume', volume)
  },

  playNext: async (currentPath: string, mode: string): Promise<Song> => {
    const currentIndex = mockSongs.findIndex(s => s.path === currentPath)
    let nextIndex: number
    
    if (mode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * mockSongs.length)
    } else if (mode === 'loop') {
      nextIndex = currentIndex
    } else {
      nextIndex = (currentIndex + 1) % mockSongs.length
    }
    
    return mockSongs[nextIndex]
  },

  playPrev: async (currentPath: string, mode: string): Promise<Song> => {
    const currentIndex = mockSongs.findIndex(s => s.path === currentPath)
    let prevIndex: number
    
    if (mode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * mockSongs.length)
    } else if (mode === 'loop') {
      prevIndex = currentIndex
    } else {
      prevIndex = (currentIndex - 1 + mockSongs.length) % mockSongs.length
    }
    
    return mockSongs[prevIndex]
  },

  getPlayerState: async (): Promise<import('./modules/types').BackendPlayerState> => {
    return {
      state: 'Stopped',
      volume: APP_CONFIG.player.defaultVolume,
      position: 0,
    }
  },
}
