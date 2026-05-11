import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Song, PlayMode } from '../types'
import { APP_CONFIG } from '../config'

export type QueueSource = 'liked' | 'local' | 'history' | 'hidden'

interface PlayerSettings {
  volume: number
  playMode: PlayMode
}

interface PlayerSettingsStore {
  settings: PlayerSettings
  setVolume: (volume: number) => void
  setPlayMode: (mode: PlayMode) => void
}

export const usePlayerSettingsStore = create<PlayerSettingsStore>()(
  persist(
    (set) => ({
      settings: {
        volume: APP_CONFIG.player.defaultVolume,
        playMode: 'list',
      },
      setVolume: (volume) =>
        set((state) => ({
          settings: { ...state.settings, volume },
        })),
      setPlayMode: (playMode) =>
        set((state) => ({
          settings: { ...state.settings, playMode },
        })),
    }),
    {
      name: 'player-settings',
    }
  )
)

interface PlayQueueState {
  queue: Song[]
  currentIndex: number
  originalQueue: Song[]
  queueSource: QueueSource
  lastSongPath: string | null
}

interface PlayQueueStore extends PlayQueueState {
  setQueue: (songs: Song[], startIndex?: number, source?: QueueSource) => void
  addToQueue: (song: Song) => void
  addToQueueNext: (song: Song) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  moveInQueue: (fromIndex: number, toIndex: number) => void

  getCurrentSong: () => Song | null
  getNextSong: (mode: PlayMode) => Song | null
  getPrevSong: (mode: PlayMode) => Song | null
  moveToNext: (mode: PlayMode) => Song | null
  moveToPrev: (mode: PlayMode) => Song | null

  shuffleQueue: () => void
  unshuffleQueue: () => void
  toggleShuffle: () => void

  setLastSongPath: (path: string | null) => void
  setCurrentIndex: (index: number) => void
}

function shuffleTracksKeepCurrent<T extends { path: string }>(tracks: T[], currentIndex: number): T[] {
  const shuffled = [...tracks]
  const current = shuffled.splice(currentIndex, 1)[0]
  let m = shuffled.length
  while (m) {
    const i = Math.floor(Math.random() * m--)
    ;[shuffled[m], shuffled[i]] = [shuffled[i], shuffled[m]]
  }
  shuffled.unshift(current)
  return shuffled
}

export const usePlayQueueStore = create<PlayQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      originalQueue: [],
      queueSource: 'local',
      lastSongPath: null,

      setQueue: (songs, startIndex = 0, source = 'local') => {
        const { settings } = usePlayerSettingsStore.getState()
        if (settings.playMode === 'shuffle' && songs.length > 1) {
          const shuffled = shuffleTracksKeepCurrent(songs, startIndex)
          set({
            queue: shuffled,
            originalQueue: songs,
            currentIndex: 0,
            queueSource: source,
          })
        } else {
          set({
            queue: songs,
            originalQueue: songs,
            currentIndex: startIndex,
            queueSource: source,
          })
        }
      },

      addToQueue: (song) => {
        set((state) => ({
          queue: [...state.queue, song],
          originalQueue: [...state.originalQueue, song],
        }))
      },

      addToQueueNext: (song) => {
        set((state) => {
          const newQueue = [...state.queue]
          const insertIndex = state.currentIndex + 1
          newQueue.splice(insertIndex, 0, song)

          const newOriginalQueue = [...state.originalQueue]
          const currentSong = state.queue[state.currentIndex]
          const origCurrentIndex = currentSong
            ? newOriginalQueue.findIndex((s) => s.path === currentSong.path)
            : newOriginalQueue.length
          newOriginalQueue.splice(origCurrentIndex + 1, 0, song)

          return {
            queue: newQueue,
            originalQueue: newOriginalQueue,
          }
        })
      },

      removeFromQueue: (index) => {
        set((state) => {
          if (index < 0 || index >= state.queue.length) return state

          const removedPath = state.queue[index].path
          const newQueue = state.queue.filter((_, i) => i !== index)
          const origIndex = state.originalQueue.findIndex((s) => s.path === removedPath)
          const newOriginalQueue = [...state.originalQueue]
          if (origIndex >= 0) newOriginalQueue.splice(origIndex, 1)
          let newIndex = state.currentIndex

          if (index < state.currentIndex) {
            newIndex = state.currentIndex - 1
          } else if (index === state.currentIndex) {
            newIndex = Math.min(state.currentIndex, newQueue.length - 1)
          }

          return {
            queue: newQueue,
            originalQueue: newOriginalQueue,
            currentIndex: newIndex,
          }
        })
      },

      clearQueue: () => {
        set({
          queue: [],
          originalQueue: [],
          currentIndex: -1,
        })
      },

      moveInQueue: (fromIndex, toIndex) => {
        set((state) => {
          if (
            fromIndex < 0 ||
            fromIndex >= state.queue.length ||
            toIndex < 0 ||
            toIndex >= state.queue.length
          ) {
            return state
          }

          const newQueue = [...state.queue]
          const [removed] = newQueue.splice(fromIndex, 1)
          newQueue.splice(toIndex, 0, removed)

          const movedSong = state.queue[fromIndex]
          const origFromIndex = state.originalQueue.findIndex((s) => s.path === movedSong.path)
          const newOriginalQueue = [...state.originalQueue]
          if (origFromIndex >= 0) {
            const [origRemoved] = newOriginalQueue.splice(origFromIndex, 1)
            const targetSong = state.queue[toIndex]
            const origToIndex = targetSong
              ? newOriginalQueue.findIndex((s) => s.path === targetSong.path)
              : newOriginalQueue.length
            newOriginalQueue.splice(origToIndex >= 0 ? origToIndex : newOriginalQueue.length, 0, origRemoved)
          }

          let newIndex = state.currentIndex
          if (fromIndex === state.currentIndex) {
            newIndex = toIndex
          } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
            newIndex = state.currentIndex - 1
          } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
            newIndex = state.currentIndex + 1
          }

          return {
            queue: newQueue,
            originalQueue: newOriginalQueue,
            currentIndex: newIndex,
          }
        })
      },

      getCurrentSong: () => {
        const { queue, currentIndex } = get()
        if (currentIndex >= 0 && currentIndex < queue.length) {
          return queue[currentIndex]
        }
        return null
      },

      getNextSong: (mode) => {
        const { queue, currentIndex } = get()
        if (queue.length === 0) return null

        if (mode === 'loop') {
          return queue[currentIndex] || null
        }

        const nextIndex = (currentIndex + 1) % queue.length
        return queue[nextIndex]
      },

      getPrevSong: (mode) => {
        const { queue, currentIndex } = get()
        if (queue.length === 0) return null

        if (mode === 'loop') {
          return queue[currentIndex] || null
        }

        const prevIndex = (currentIndex - 1 + queue.length) % queue.length
        return queue[prevIndex]
      },

      moveToNext: (mode) => {
        const { queue, currentIndex } = get()
        if (queue.length === 0) return null

        let newIndex: number

        if (mode === 'loop') {
          newIndex = currentIndex
        } else {
          newIndex = (currentIndex + 1) % queue.length
        }

        const song = queue[newIndex]
        set({ currentIndex: newIndex, lastSongPath: song?.path || null })
        return song
      },

      moveToPrev: (mode) => {
        const { queue, currentIndex } = get()
        if (queue.length === 0) return null

        let newIndex: number

        if (mode === 'loop') {
          newIndex = currentIndex
        } else {
          newIndex = (currentIndex - 1 + queue.length) % queue.length
        }

        const song = queue[newIndex]
        set({ currentIndex: newIndex, lastSongPath: song?.path || null })
        return song
      },

      shuffleQueue: () => {
        set((state) => {
          if (state.queue.length <= 1) return state

          const shuffled = shuffleTracksKeepCurrent(state.queue, state.currentIndex)

          return {
            queue: shuffled,
            currentIndex: 0,
          }
        })
      },

      unshuffleQueue: () => {
        set((state) => {
          if (state.originalQueue.length === 0) return state

          const currentSong = state.queue[state.currentIndex]
          const newIndex = state.originalQueue.findIndex((s) => s.path === currentSong?.path)

          return {
            queue: [...state.originalQueue],
            currentIndex: newIndex >= 0 ? newIndex : 0,
          }
        })
      },

      toggleShuffle: () => {
        const { settings } = usePlayerSettingsStore.getState()
        const isShuffled = settings.playMode === 'shuffle'

        if (isShuffled) {
          get().unshuffleQueue()
          usePlayerSettingsStore.getState().setPlayMode('list')
        } else {
          get().shuffleQueue()
          usePlayerSettingsStore.getState().setPlayMode('shuffle')
        }
      },

      setLastSongPath: (path) => {
        set({ lastSongPath: path })
      },

      setCurrentIndex: (index) => {
        set({ currentIndex: index })
      },
    }),
    {
      name: 'play-queue',
      partialize: (state) => ({
        lastSongPath: state.lastSongPath,
        queueSource: state.queueSource,
      }),
    }
  )
)
