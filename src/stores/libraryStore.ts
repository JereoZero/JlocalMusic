import { create } from 'zustand'
import type { Song } from '../types'
import api from '../api'
import { useToastStore } from './toastStore'
import { useOperationLogStore } from './operationLogStore'

const log = (action: string, detail?: string, error?: string) => {
  useOperationLogStore.getState().log(action, detail, error)
}

interface LibraryStore {
  songs: Song[]
  likedPaths: Set<string>
  hiddenPaths: Set<string>
  isLoading: boolean
  error: string | null
  fetchSongs: () => Promise<void>
  fetchLikedPaths: () => Promise<void>
  fetchHiddenPaths: () => Promise<void>
  refreshAll: () => Promise<void>
  toggleLike: (path: string, context?: 'hidden') => Promise<void>
  toggleHidden: (path: string, shouldRemoveLike?: boolean) => Promise<void>
  toggleLikeWithContext: (path: string, context?: 'hidden') => Promise<void>
  toggleHiddenWithContext: (path: string, context: 'liked' | 'local' | 'hidden') => Promise<void>
  clearError: () => void
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  likedPaths: new Set(),
  hiddenPaths: new Set(),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchSongs: async () => {
    set({ isLoading: true, error: null })
    try {
      const songs = await api.getSongs()
      set({ songs })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取歌曲失败'
      set({ error: message })
      useToastStore.getState().error(message)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchLikedPaths: async () => {
    try {
      const paths = await api.getLikedPaths()
      set({ likedPaths: new Set(paths) })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取喜欢列表失败'
      useToastStore.getState().error(message)
    }
  },

  fetchHiddenPaths: async () => {
    try {
      const paths = await api.getHiddenPaths()
      set({ hiddenPaths: new Set(paths) })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取隐藏列表失败'
      useToastStore.getState().error(message)
    }
  },

  refreshAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const [songs, likedPaths, hiddenPaths] = await Promise.all([
        api.getSongs(),
        api.getLikedPaths(),
        api.getHiddenPaths(),
      ])
      set({
        songs,
        likedPaths: new Set(likedPaths),
        hiddenPaths: new Set(hiddenPaths),
      })
      useToastStore.getState().success('刷新成功')
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新失败'
      set({ error: message })
      useToastStore.getState().error(message)
    } finally {
      set({ isLoading: false })
    }
  },

  toggleLike: async (path: string, context?: 'hidden') => {
    const { likedPaths, hiddenPaths } = get()
    const newLiked = !likedPaths.has(path)
    
    log('点击喜欢', `${newLiked ? '添加' : '取消'}: ${path.split('/').pop()}`)

    try {
      // 如果在隐藏列表中点击喜欢，先取消隐藏
      if (context === 'hidden' && hiddenPaths.has(path) && newLiked) {
        await api.unhideSong(path)
        const newHiddenPaths = new Set(hiddenPaths)
        newHiddenPaths.delete(path)
        set({ hiddenPaths: newHiddenPaths })
        useToastStore.getState().success('已恢复歌曲到本地音乐')
      }

      await api.toggleLike(path, newLiked)
      log('后台执行', `toggleLike(${path}, ${newLiked})`)

      const newLikedPaths = new Set(likedPaths)
      if (newLiked) {
        newLikedPaths.add(path)
        useToastStore.getState().like('已添加到喜欢')
      } else {
        newLikedPaths.delete(path)
        useToastStore.getState().info('已从喜欢列表移除')
      }
      set({ likedPaths: newLikedPaths })
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      log('喜欢操作失败', message)
      useToastStore.getState().error(message)
    }
  },

  toggleHidden: async (path: string, shouldRemoveLike: boolean = false) => {
    const { hiddenPaths, likedPaths } = get()
    const newHidden = !hiddenPaths.has(path)
    
    log('点击隐藏', `${newHidden ? '隐藏' : '显示'}: ${path.split('/').pop()}`)

    try {
      if (newHidden) {
        await api.hideSong(path)
        log('后台执行', `hideSong(${path})`)
        
        // 如果需要同时取消喜欢
        if (shouldRemoveLike && likedPaths.has(path)) {
          await api.toggleLike(path, false)
          const newLikedPaths = new Set(likedPaths)
          newLikedPaths.delete(path)
          set({ likedPaths: newLikedPaths })
        }
        
        useToastStore.getState().hide('已隐藏歌曲')
      } else {
        await api.unhideSong(path)
        log('后台执行', `unhideSong(${path})`)
        useToastStore.getState().success('已恢复歌曲')
      }

      const newHiddenPaths = new Set(hiddenPaths)
      if (newHidden) {
        newHiddenPaths.add(path)
      } else {
        newHiddenPaths.delete(path)
      }
      set({ hiddenPaths: newHiddenPaths })
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      log('隐藏操作失败', message)
      useToastStore.getState().error(message)
    }
  },

  // 保留旧函数名作为别名，保持向后兼容
  toggleHiddenWithContext: async (path: string, _context: 'liked' | 'local' | 'hidden') => {
    const { hiddenPaths, likedPaths } = get()
    const newHidden = !hiddenPaths.has(path)

    try {
      if (newHidden) {
        await api.hideSong(path)
        
        if (likedPaths.has(path)) {
          await api.toggleLike(path, false)
          const newLikedPaths = new Set(likedPaths)
          newLikedPaths.delete(path)
          set({ likedPaths: newLikedPaths })
        }
        useToastStore.getState().hide('已隐藏歌曲')
      } else {
        await api.unhideSong(path)
        useToastStore.getState().success('已恢复歌曲')
      }

      const newHiddenPaths = new Set(hiddenPaths)
      if (newHidden) {
        newHiddenPaths.add(path)
      } else {
        newHiddenPaths.delete(path)
      }
      set({ hiddenPaths: newHiddenPaths })
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      useToastStore.getState().error(message)
    }
  },

  toggleLikeWithContext: async (path: string, context?: 'hidden') => {
    get().toggleLike(path, context)
  },
}))
