import { create } from 'zustand'
import { listen } from '@tauri-apps/api/event'
import type { Song } from '../types'
import * as api from '../api/modules'
import { usePlayQueueStore, usePlayerSettingsStore, QueueSource } from './playQueueStore'
import { useOperationLogStore } from './operationLogStore'

const log = (action: string, detail?: string, error?: string) => {
  useOperationLogStore.getState().log(action, detail, error)
}

interface PlaybackProgressEvent {
  path: string
  position: number
  duration: number
}

interface PlayerStore {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  
  playSong: (song: Song, queue?: Song[], source?: QueueSource) => Promise<void>
  playSongAtIndex: (index: number) => Promise<void>
  togglePlay: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  seek: (time: number) => Promise<void>
  setVolume: (volume: number) => Promise<void>
  playNext: () => Promise<void>
  playPrev: () => Promise<void>
  initMediaSession: () => void
  updateMediaSession: (song: Song) => void
  restoreLastSong: () => Promise<void>
  playRandomSong: () => Promise<void>
  initEventListeners: () => void
  cleanupEventListeners: () => void
}

// 模块级变量用于管理全局单例资源
// 这些变量需要在模块级别维护，因为：
// 1. 定时器需要在组件卸载后继续运行
// 2. 事件监听器只需要注册一次
// 3. 避免在 React 严格模式下重复初始化
let animationFrameId: number | null = null
let lastUpdateTime = 0
let eventListenersInitialized = false
let eventUnsubscribers: Array<() => void> = []

function updateProgress() {
  const store = usePlayerStore.getState()
  if (!store.isPlaying || !store.currentSong) {
    animationFrameId = null
    return
  }
  
  const now = performance.now()
  const delta = (now - lastUpdateTime) / 1000
  lastUpdateTime = now
  
  const newTime = store.currentTime + delta
  const maxTime = store.duration || store.currentSong.duration || 0
  
  if (newTime >= maxTime && maxTime > 0) {
    usePlayerStore.setState({ currentTime: maxTime })
    store.playNext()
  } else {
    usePlayerStore.setState({ currentTime: newTime })
    animationFrameId = requestAnimationFrame(updateProgress)
  }
}

function startProgressTimer() {
  if (animationFrameId !== null) return
  
  lastUpdateTime = performance.now()
  animationFrameId = requestAnimationFrame(updateProgress)
}

function stopProgressTimer() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

async function playSongInternal(song: Song, logAction: string) {
  log(logAction, song.title)
  
  try {
    await api.playSong(song.path)
    log('播放成功', song.title)
    usePlayerStore.setState({ currentSong: song, isPlaying: true, currentTime: 0, duration: song.duration })
    usePlayQueueStore.getState().setLastSongPath(song.path)
    lastUpdateTime = performance.now()
    startProgressTimer()
    
    try {
      await api.addPlayHistory(song.path, 0, false)
    } catch (e) {
      console.error('Failed to add play history:', e)
    }
    
    usePlayerStore.getState().updateMediaSession(song)
    return true
  } catch (error) {
    log('播放失败', song.title, String(error))
    console.error('Failed to play song:', error)
    return false
  }
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: usePlayerSettingsStore.getState().settings.volume,

  playSong: async (song, queue, source = 'local') => {
    const queueStore = usePlayQueueStore.getState()
    
    if (queue && queue.length > 0) {
      const startIndex = queue.findIndex(s => s.path === song.path)
      queueStore.setQueue(queue, startIndex >= 0 ? startIndex : 0, source)
    }
    
    await playSongInternal(song, '点击播放')
  },

  playSongAtIndex: async (index) => {
    const queueStore = usePlayQueueStore.getState()
    const song = queueStore.queue[index]
    if (!song) return
    
    queueStore.setCurrentIndex(index)
    await playSongInternal(song, `播放列表项 ${index}`)
  },

  togglePlay: async () => {
    const { isPlaying, currentSong } = get()
    
    log('点击播放/暂停', `当前状态: ${isPlaying ? '播放中' : '暂停中'}`)
    
    if (!currentSong) {
      log('无当前歌曲', '播放随机歌曲')
      await get().playRandomSong()
      return
    }
    
    try {
      if (isPlaying) {
        log('后台执行', 'pauseSong()')
        await api.pauseSong()
        stopProgressTimer()
        set({ isPlaying: false })
        log('暂停成功')
      } else {
        log('后台执行', 'resumeSong()')
        await api.resumeSong()
        lastUpdateTime = performance.now()
        startProgressTimer()
        set({ isPlaying: true })
        log('恢复成功')
      }
    } catch (error) {
      log('操作失败', String(error))
      console.error('Failed to toggle play:', error)
    }
  },

  pause: async () => {
    log('暂停播放')
    try {
      await api.pauseSong()
      log('后台执行', 'pauseSong()')
      stopProgressTimer()
      set({ isPlaying: false })
    } catch (error) {
      log('暂停失败', String(error))
      console.error('Failed to pause:', error)
    }
  },

  resume: async () => {
    const { currentSong } = get()
    if (!currentSong) {
      await get().playRandomSong()
      return
    }
    
    log('恢复播放')
    try {
      await api.resumeSong()
      log('后台执行', 'resumeSong()')
      lastUpdateTime = performance.now()
      startProgressTimer()
      set({ isPlaying: true })
    } catch (error) {
      log('恢复失败', String(error))
      console.error('Failed to resume:', error)
    }
  },

  stop: async () => {
    log('停止播放')
    try {
      await api.stopSong()
      log('后台执行', 'stopSong()')
      stopProgressTimer()
      set({ isPlaying: false, currentTime: 0 })
    } catch (error) {
      log('停止失败', String(error))
      console.error('Failed to stop:', error)
    }
  },
  
  seek: async (time) => {
    log('拖动进度条', `${time.toFixed(1)}s`)
    try {
      await api.seekSong(time)
      log('后台执行', `seekSong(${time.toFixed(1)})`)
      // 停止定时器，更新状态，然后重启定时器
      stopProgressTimer()
      set({ currentTime: time })
      lastUpdateTime = performance.now()
      startProgressTimer()
    } catch (error) {
      log('跳转失败', String(error))
      console.error('Failed to seek:', error)
    }
  },
  
  setVolume: async (volume) => {
    log('调节音量', `${Math.round(volume * 100)}%`)
    try {
      await api.setVolume(volume)
      log('后台执行', `setVolume(${Math.round(volume * 100)}%)`)
      usePlayerSettingsStore.getState().setVolume(volume)
      set({ volume })
    } catch (error) {
      log('设置音量失败', String(error))
      console.error('Failed to set volume:', error)
    }
  },

  playNext: async () => {
    log('点击下一首')
    const queueStore = usePlayQueueStore.getState()
    const settingsStore = usePlayerSettingsStore.getState()
    let { playMode } = settingsStore.settings
    
    if (playMode === 'loop') {
      settingsStore.setPlayMode('list')
      playMode = 'list'
    }
    
    const nextSong = queueStore.moveToNext(playMode)
    if (!nextSong) {
      log('没有下一首')
      return
    }
    
    await playSongInternal(nextSong, '下一首')
  },

  playPrev: async () => {
    log('点击上一首')
    const queueStore = usePlayQueueStore.getState()
    const settingsStore = usePlayerSettingsStore.getState()
    let { playMode } = settingsStore.settings
    
    if (playMode === 'loop') {
      settingsStore.setPlayMode('list')
      playMode = 'list'
    }
    
    const prevSong = queueStore.moveToPrev(playMode)
    if (!prevSong) {
      log('没有上一首')
      return
    }
    
    await playSongInternal(prevSong, '上一首')
  },

  initMediaSession: () => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return
    
    navigator.mediaSession.setActionHandler('play', () => {
      get().resume()
    })
    
    navigator.mediaSession.setActionHandler('pause', () => {
      get().pause()
    })
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      get().playPrev()
    })
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      get().playNext()
    })
    
    navigator.mediaSession.setActionHandler('seekto', (details: { seekTime?: number }) => {
      if (details.seekTime !== undefined) {
        get().seek(details.seekTime)
      }
    })
  },

  updateMediaSession: (song: Song) => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return
    
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album,
      })
      
      navigator.mediaSession.setPositionState?.({
        duration: song.duration,
        position: 0,
      })
    } catch (e) {
      console.error('Failed to update media session:', e)
    }
  },

  restoreLastSong: async () => {
    const queueStore = usePlayQueueStore.getState()
    const { lastSongPath, queueSource } = queueStore
    
    if (!lastSongPath) {
      await get().playRandomSong()
      return
    }
    
    let songs: Song[]
    let source: QueueSource
    
    if (queueSource === 'liked') {
      const { songs: likedSongs } = await api.getLikedSongs()
      songs = likedSongs
      source = 'liked'
    } else {
      songs = await api.getSongs()
      source = 'local'
    }
    
    const songIndex = songs.findIndex(s => s.path === lastSongPath)
    if (songIndex >= 0) {
      const song = songs[songIndex]
      queueStore.setQueue(songs, songIndex, source)
      
      try {
        await api.playSong(song.path)
        await api.pauseSong()
        log('恢复歌曲', song.title)
      } catch (e) {
        console.error('Failed to restore song:', e)
      }
      
      set({ currentSong: song, currentTime: 0, duration: song.duration, isPlaying: false })
      get().updateMediaSession(song)
    } else {
      await get().playRandomSong()
    }
  },

  playRandomSong: async () => {
    const queueStore = usePlayQueueStore.getState()
    const { queueSource } = queueStore
    let songs: Song[] = []
    let source: QueueSource = 'local'
    
    if (queueSource === 'liked') {
      try {
        const { songs: likedSongs } = await api.getLikedSongs()
        if (likedSongs.length > 0) {
          songs = likedSongs
          source = 'liked'
        }
      } catch (e) {
        console.error('Failed to get liked songs:', e)
      }
    }
    
    if (songs.length === 0) {
      try {
        songs = await api.getSongs()
        source = 'local'
      } catch (e) {
        console.error('Failed to get songs:', e)
        return
      }
    }
    
    if (songs.length === 0) return
    
    const randomIndex = Math.floor(Math.random() * songs.length)
    const song = songs[randomIndex]
    
    queueStore.setQueue(songs, randomIndex, source)
    await playSongInternal(song, '随机播放')
  },

  initEventListeners: () => {
    if (eventListenersInitialized) return
    eventListenersInitialized = true

    // 监听后端播放进度事件
    const unsubProgress = listen<PlaybackProgressEvent>('playback_progress', (event) => {
      const { position, duration } = event.payload
      const store = usePlayerStore.getState()
      
      // 只有在播放状态时才更新进度
      if (store.isPlaying && store.currentSong) {
        lastUpdateTime = performance.now()
        set({ currentTime: position, duration })
      }
    })
    eventUnsubscribers.push(() => { unsubProgress.then(fn => fn()) })

    // 监听歌曲播放完成事件
    const unsubFinished = listen('track_finished', () => {
      log('歌曲播放完成')
      usePlayerStore.getState().playNext()
    })
    eventUnsubscribers.push(() => { unsubFinished.then(fn => fn()) })

    log('事件监听器初始化完成')
  },

  cleanupEventListeners: () => {
    eventUnsubscribers.forEach(fn => fn())
    eventUnsubscribers = []
    eventListenersInitialized = false
    log('事件监听器已清理')
  },
}))
