import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlayerStore } from '../playerStore'
import { usePlayerSettingsStore, usePlayQueueStore } from '../playQueueStore'
import type { Song } from '../../types'

const createMockSong = (overrides?: Partial<Song>): Song => ({
  id: 'test-id',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 180,
  path: '/test/song.mp3',
  play_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

vi.mock('../../api', () => ({
  default: {
    playSong: vi.fn().mockResolvedValue(undefined),
    pauseSong: vi.fn().mockResolvedValue(undefined),
    resumeSong: vi.fn().mockResolvedValue(undefined),
    stopSong: vi.fn().mockResolvedValue(undefined),
    seekSong: vi.fn().mockResolvedValue(undefined),
    setVolume: vi.fn().mockResolvedValue(undefined),
    addPlayHistory: vi.fn().mockResolvedValue(undefined),
    getSongs: vi.fn().mockResolvedValue({ songs: [] }),
    getLikedSongs: vi.fn().mockResolvedValue({ songs: [] }),
  },
  getPlayerState: vi.fn().mockResolvedValue({ state: 'Playing', volume: 0.8, position: 0 }),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}))

describe('playerSettingsStore', () => {
  let settingsStore: typeof usePlayerSettingsStore

  beforeEach(() => {
    settingsStore = usePlayerSettingsStore
    settingsStore.setState({
      settings: {
        volume: 0.8,
        playMode: 'list',
      },
    })
  })

  describe('setPlayMode', () => {
    it('应该更新播放模式', () => {
      settingsStore.getState().setPlayMode('loop')
      expect(settingsStore.getState().settings.playMode).toBe('loop')

      settingsStore.getState().setPlayMode('shuffle')
      expect(settingsStore.getState().settings.playMode).toBe('shuffle')

      settingsStore.getState().setPlayMode('list')
      expect(settingsStore.getState().settings.playMode).toBe('list')
    })
  })

  describe('setVolume', () => {
    it('应该更新音量设置', () => {
      settingsStore.getState().setVolume(0.5)
      expect(settingsStore.getState().settings.volume).toBe(0.5)
    })
  })
})

describe('playQueueStore', () => {
  let queueStore: typeof usePlayQueueStore

  beforeEach(() => {
    queueStore = usePlayQueueStore
    queueStore.setState({
      queue: [],
      currentIndex: -1,
      originalQueue: [],
    })
  })

  describe('setQueue', () => {
    it('应该设置播放队列', () => {
      const songs = [
        createMockSong({ id: '1', path: '/music/1.mp3' }),
        createMockSong({ id: '2', path: '/music/2.mp3' }),
      ]
      
      queueStore.getState().setQueue(songs, 0)
      
      expect(queueStore.getState().queue).toHaveLength(2)
      expect(queueStore.getState().currentIndex).toBe(0)
    })
  })

  describe('getCurrentSong', () => {
    it('应该返回当前歌曲', () => {
      const songs = [
        createMockSong({ id: '1', path: '/music/1.mp3' }),
        createMockSong({ id: '2', path: '/music/2.mp3' }),
      ]
      
      queueStore.getState().setQueue(songs, 1)
      
      expect(queueStore.getState().getCurrentSong()?.id).toBe('2')
    })

    it('队列为空时应该返回 null', () => {
      expect(queueStore.getState().getCurrentSong()).toBeNull()
    })
  })

  describe('moveToNext', () => {
    it('应该移动到下一首', () => {
      const songs = [
        createMockSong({ id: '1', path: '/music/1.mp3' }),
        createMockSong({ id: '2', path: '/music/2.mp3' }),
        createMockSong({ id: '3', path: '/music/3.mp3' }),
      ]
      
      queueStore.getState().setQueue(songs, 0)
      const nextSong = queueStore.getState().moveToNext('list')
      
      expect(nextSong?.id).toBe('2')
      expect(queueStore.getState().currentIndex).toBe(1)
    })

    it('在最后一首时应该循环到第一首', () => {
      const songs = [
        createMockSong({ id: '1', path: '/music/1.mp3' }),
        createMockSong({ id: '2', path: '/music/2.mp3' }),
      ]
      
      queueStore.getState().setQueue(songs, 1)
      const nextSong = queueStore.getState().moveToNext('list')
      
      expect(nextSong?.id).toBe('1')
      expect(queueStore.getState().currentIndex).toBe(0)
    })
  })

  describe('moveToPrev', () => {
    it('应该移动到上一首', () => {
      const songs = [
        createMockSong({ id: '1', path: '/music/1.mp3' }),
        createMockSong({ id: '2', path: '/music/2.mp3' }),
        createMockSong({ id: '3', path: '/music/3.mp3' }),
      ]
      
      queueStore.getState().setQueue(songs, 2)
      const prevSong = queueStore.getState().moveToPrev('list')
      
      expect(prevSong?.id).toBe('2')
      expect(queueStore.getState().currentIndex).toBe(1)
    })

    it('在第一首时应该循环到最后一首', () => {
      const songs = [
        createMockSong({ id: '1', path: '/music/1.mp3' }),
        createMockSong({ id: '2', path: '/music/2.mp3' }),
      ]
      
      queueStore.getState().setQueue(songs, 0)
      const prevSong = queueStore.getState().moveToPrev('list')
      
      expect(prevSong?.id).toBe('2')
      expect(queueStore.getState().currentIndex).toBe(1)
    })
  })
})
