import { create } from 'zustand'
import { listen } from '@tauri-apps/api/event'
import type { Song } from '../types'
import * as api from '../api/modules'
import { usePlayQueueStore, usePlayerSettingsStore, QueueSource } from './playQueueStore'
import { debounce } from 'es-toolkit'
import { useOperationLogStore } from './operationLogStore'
import { handleError } from '../utils/errorHandler'

const log = (action: string, detail?: string, error?: string) => {
  useOperationLogStore.getState().log(action, detail, error)
}

const debouncedSetVolume = debounce(async (volume: number) => {
  try {
    await api.setVolume(volume)
  } catch (error) {
    log('设置音量失败', String(error))
  }
}, 100)

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
  destroy: () => void
}

let animationFrameId: number | null = null
let lastUpdateTime = 0
let lastBackendSyncTime = 0
let eventListenersInitialized = false
let eventUnsubscribers: Array<() => void> = []
let currentPlayPath: string | null = null
let accumulatedPlayedMs = 0
let playOperationId = 0

function resetModuleState() {
  stopProgressTimer()
  eventUnsubscribers.forEach((fn) => fn())
  eventUnsubscribers = []
  eventListenersInitialized = false
  currentPlayPath = null
  accumulatedPlayedMs = 0
  playOperationId = 0
  lastUpdateTime = 0
  lastBackendSyncTime = 0
}

async function finalizePlayHistory(completed: boolean) {
  if (!currentPlayPath) return
  const path = currentPlayPath
  const elapsed = Math.floor(accumulatedPlayedMs / 1000)
  currentPlayPath = null
  accumulatedPlayedMs = 0
  try {
    await api.addPlayHistory(path, elapsed, completed)
  } catch (e) {
    handleError(e, '记录播放历史')
  }
}

function updateProgress() {
  const store = usePlayerStore.getState()
  if (!store.isPlaying || !store.currentSong) {
    animationFrameId = null
    return
  }

  const now = performance.now()
  const delta = (now - lastUpdateTime) / 1000
  lastUpdateTime = now

  accumulatedPlayedMs += delta * 1000

  const newTime = store.currentTime + delta
  const maxTime = store.duration || store.currentSong.duration || 0

  if (maxTime <= 0) {
    animationFrameId = requestAnimationFrame(updateProgress)
    return
  }

  if (newTime >= maxTime) {
    animationFrameId = null
    usePlayerStore.setState({ currentTime: maxTime })
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
  const opId = ++playOperationId
  log(logAction, song.title)

  await finalizePlayHistory(false)

  if (opId !== playOperationId) return

  try {
    await api.playSong(song.path)
    if (opId !== playOperationId) return

    log('播放成功', song.title)
    usePlayerStore.setState({
      currentSong: song,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration,
    })
    usePlayQueueStore.getState().setLastSongPath(song.path)
    lastUpdateTime = performance.now()
    currentPlayPath = song.path
    startProgressTimer()

    usePlayerStore.getState().updateMediaSession(song)
    return true
  } catch (error) {
    if (opId !== playOperationId) return
    handleError(error, '播放歌曲')
    log('播放失败', String(error))
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
      const startIndex = queue.findIndex((s) => s.path === song.path)
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

    const opId = ++playOperationId

    try {
      if (isPlaying) {
        log('后台执行', 'pauseSong()')
        await api.pauseSong()
        if (opId !== playOperationId) return
        stopProgressTimer()
        set({ isPlaying: false })
        log('暂停成功')
      } else {
        log('后台执行', 'resumeSong()')
        await api.resumeSong()
        if (opId !== playOperationId) return
        lastUpdateTime = performance.now()
        startProgressTimer()
        set({ isPlaying: true })
        log('恢复成功')
      }
    } catch (error) {
      if (opId !== playOperationId) return
      log('操作失败', String(error))
      handleError(error, '播放切换')
    }
  },

  pause: async () => {
    log('暂停播放')
    const opId = ++playOperationId
    try {
      await api.pauseSong()
      if (opId !== playOperationId) return
      log('后台执行', 'pauseSong()')
      stopProgressTimer()
      set({ isPlaying: false })
    } catch (error) {
      if (opId !== playOperationId) return
      log('暂停失败', String(error))
      handleError(error, '暂停')
    }
  },

  resume: async () => {
    const { currentSong } = get()
    if (!currentSong) {
      await get().playRandomSong()
      return
    }

    log('恢复播放')
    const opId = ++playOperationId
    try {
      await api.resumeSong()
      if (opId !== playOperationId) return
      log('后台执行', 'resumeSong()')
      lastUpdateTime = performance.now()
      startProgressTimer()
      set({ isPlaying: true })
    } catch (error) {
      if (opId !== playOperationId) return
      log('恢复失败', String(error))
      handleError(error, '恢复播放')
    }
  },

  stop: async () => {
    log('停止播放')
    ++playOperationId
    await finalizePlayHistory(false)
    try {
      await api.stopSong()
      log('后台执行', 'stopSong()')
      stopProgressTimer()
      set({ isPlaying: false, currentTime: 0 })
    } catch (error) {
      log('停止失败', String(error))
      handleError(error, '停止')
    }
  },

  seek: async (time) => {
    log('拖动进度条', `${time.toFixed(1)}s`)
    try {
      await api.seekSong(time)
      log('后台执行', `seekSong(${time.toFixed(1)})`)
      stopProgressTimer()
      set({ currentTime: time })
      lastUpdateTime = performance.now()
      startProgressTimer()
    } catch (error) {
      log('跳转失败', String(error))
    }
  },

  setVolume: async (volume) => {
    log('调节音量', `${Math.round(volume * 100)}%`)
    usePlayerSettingsStore.getState().setVolume(volume)
    set({ volume })
    debouncedSetVolume(volume)
  },

  playNext: async () => {
    log('点击下一首')
    const queueStore = usePlayQueueStore.getState()
    const { playMode } = usePlayerSettingsStore.getState().settings

    if (playMode === 'loop') {
      const current = get().currentSong
      if (current) {
        await playSongInternal(current, '下一首(单曲循环)')
      }
      return
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
    const { playMode } = usePlayerSettingsStore.getState().settings

    if (playMode === 'loop') {
      const current = get().currentSong
      if (current) {
        await playSongInternal(current, '上一首(单曲循环)')
      }
      return
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
    if (typeof MediaMetadata === 'undefined') return

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
      handleError(e, '更新MediaSession')
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

    const songIndex = songs.findIndex((s) => s.path === lastSongPath)
    if (songIndex >= 0) {
      const song = songs[songIndex]
      queueStore.setQueue(songs, songIndex, source)
      set({ currentSong: song, currentTime: 0, duration: song.duration, isPlaying: false })
      get().updateMediaSession(song)
      log('恢复歌曲(仅本地状态)', song.title)
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
        handleError(e, '加载喜欢列表')
      }
    }

    if (songs.length === 0) {
      try {
        songs = await api.getSongs()
        source = 'local'
      } catch (e) {
        handleError(e, '加载歌曲列表')
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

    const unsubProgress = listen<PlaybackProgressEvent>('playback_progress', (event) => {
      const { position, duration } = event.payload
      const store = usePlayerStore.getState()

      if (store.isPlaying && store.currentSong) {
        const now = performance.now()
        const gap = Math.abs(position - store.currentTime)
        const shouldSync =
          gap > 0.3 || position > store.currentTime || now - lastBackendSyncTime > 3000

        if (shouldSync) {
          lastUpdateTime = now
          lastBackendSyncTime = now
          if (duration > 0) {
            set({ currentTime: position, duration })
          } else {
            set({ currentTime: position })
          }
        } else if (duration > 0 && duration !== store.duration) {
          set({ duration })
        }
      }
    })
    eventUnsubscribers.push(() => {
      unsubProgress.then((fn) => fn())
    })

    const unsubFinished = listen('track_finished', () => {
      log('歌曲播放完成')
      stopProgressTimer()
      finalizePlayHistory(true)
      usePlayerStore.getState().playNext()
    })
    eventUnsubscribers.push(() => {
      unsubFinished.then((fn) => fn())
    })

    log('事件监听器初始化完成')
  },

  cleanupEventListeners: () => {
    eventUnsubscribers.forEach((fn) => fn())
    eventUnsubscribers = []
    eventListenersInitialized = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    log('事件监听器已清理')
  },

  destroy: () => {
    resetModuleState()
    set({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    })
    log('播放器已销毁')
  },
}))
