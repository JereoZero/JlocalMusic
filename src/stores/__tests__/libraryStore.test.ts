import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Song } from '../../types'

vi.mock('../../api/backend-api', () => ({
  getSongs: vi.fn().mockResolvedValue([]),
  getLikedPaths: vi.fn().mockResolvedValue([]),
  getHiddenPaths: vi.fn().mockResolvedValue([]),
  toggleLike: vi.fn().mockResolvedValue(undefined),
  hideSong: vi.fn().mockResolvedValue(undefined),
  unhideSong: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../api/mock-api', () => ({
  mockApi: {
    getSongs: vi.fn().mockResolvedValue([]),
    getLikedPaths: vi.fn().mockResolvedValue([]),
    getHiddenPaths: vi.fn().mockResolvedValue([]),
    toggleLike: vi.fn().mockResolvedValue(undefined),
    hideSong: vi.fn().mockResolvedValue(undefined),
    unhideSong: vi.fn().mockResolvedValue(undefined),
  },
}))

const createMockSong = (overrides?: Partial<Song>): Song => ({
  id: 'test-id-1',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 180,
  path: '/music/test.mp3',
  play_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('libraryStore', () => {
  beforeEach(async () => {
    vi.resetModules()
    ;(window as any).__TAURI__ = true
  })

  afterEach(() => {
    delete (window as any).__TAURI__
    vi.restoreAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      const state = useLibraryStore.getState()
      expect(state.songs).toEqual([])
      expect(state.likedPaths).toBeInstanceOf(Set)
      expect(state.likedPaths.size).toBe(0)
      expect(state.hiddenPaths).toBeInstanceOf(Set)
      expect(state.hiddenPaths.size).toBe(0)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('状态更新', () => {
    it('应该能够设置 songs', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      const mockSongs = [createMockSong({ id: '1' }), createMockSong({ id: '2' })]
      
      useLibraryStore.setState({ songs: mockSongs })
      
      expect(useLibraryStore.getState().songs).toEqual(mockSongs)
    })

    it('应该能够设置 likedPaths', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      const paths = new Set(['/music/song1.mp3', '/music/song2.mp3'])
      
      useLibraryStore.setState({ likedPaths: paths })
      
      expect(useLibraryStore.getState().likedPaths).toEqual(paths)
    })

    it('应该能够设置 hiddenPaths', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      const paths = new Set(['/music/hidden1.mp3', '/music/hidden2.mp3'])
      
      useLibraryStore.setState({ hiddenPaths: paths })
      
      expect(useLibraryStore.getState().hiddenPaths).toEqual(paths)
    })

    it('应该能够设置 isLoading', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      
      useLibraryStore.setState({ isLoading: true })
      expect(useLibraryStore.getState().isLoading).toBe(true)
      
      useLibraryStore.setState({ isLoading: false })
      expect(useLibraryStore.getState().isLoading).toBe(false)
    })
  })

  describe('Set 操作', () => {
    it('likedPaths 应该支持添加和删除', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      const path = '/music/test.mp3'
      
      const newSet = new Set<string>()
      newSet.add(path)
      useLibraryStore.setState({ likedPaths: newSet })
      
      expect(useLibraryStore.getState().likedPaths.has(path)).toBe(true)
      
      newSet.delete(path)
      useLibraryStore.setState({ likedPaths: new Set(newSet) })
      
      expect(useLibraryStore.getState().likedPaths.has(path)).toBe(false)
    })

    it('hiddenPaths 应该支持添加和删除', async () => {
      const { useLibraryStore } = await import('../libraryStore')
      const path = '/music/test.mp3'
      
      const newSet = new Set<string>()
      newSet.add(path)
      useLibraryStore.setState({ hiddenPaths: newSet })
      
      expect(useLibraryStore.getState().hiddenPaths.has(path)).toBe(true)
      
      newSet.delete(path)
      useLibraryStore.setState({ hiddenPaths: new Set(newSet) })
      
      expect(useLibraryStore.getState().hiddenPaths.has(path)).toBe(false)
    })
  })
})
