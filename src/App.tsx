import { useState, useEffect, useCallback, useRef } from 'react'
import { Toaster, toast } from 'sonner'
import { useHotkeys } from 'react-hotkeys-hook'
import Sidebar from './components/Sidebar'
import PlayerBar from './components/PlayerBar'
import ErrorBoundary from './components/ErrorBoundary'
import LocalView from './views/LocalView'
import LikedView from './views/LikedView'
import HiddenView from './views/HiddenView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'
import LyricsView from './views/LyricsView'
import { usePlayerStore } from './stores/playerStore'
import { useLibraryStore } from './stores/libraryStore'
import { useSongCover } from './hooks/useSongCover'
import { useAlbumColor } from './hooks/useAlbumColor'
import { useTheme } from './hooks/useTheme'
import * as api from './api/modules'
import { createErrorHandler } from './utils/errorHandler'
import type { ViewType } from './types'

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('liked')
  const [previousView, setPreviousView] = useState<ViewType>('liked')
  const previousViewRef = useRef<ViewType>('liked')
  const [showLyrics, setShowLyrics] = useState(false)

  const { 
    currentSong, 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    togglePlay,
    playNext,
    playPrev,
    setVolume,
    seek,
    initMediaSession,
    restoreLastSong,
    initEventListeners,
    cleanupEventListeners,
  } = usePlayerStore()
  const { fetchSongs, fetchLikedPaths, fetchHiddenPaths } = useLibraryStore()
  
  // 获取专辑颜色
  const { cover } = useSongCover(currentSong?.path)
  const albumColors = useAlbumColor(cover, currentSong?.path)
  const mainBgColor = albumColors.main || '#121212'
  const sidebarBgColor = albumColors.sidebar || '#121212'
  
  // 初始化主题
  useTheme()

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchSongs(),
        fetchLikedPaths(),
        fetchHiddenPaths()
      ])
      toast('加载完成')
    }
    loadData()
  }, [fetchSongs, fetchLikedPaths, fetchHiddenPaths])

  useEffect(() => {
    initEventListeners()
    initMediaSession()
    restoreLastSong()

    const frontendVolume = usePlayerStore.getState().volume
    api.setVolume(frontendVolume).catch(createErrorHandler('启动音量同步'))
    
    return () => {
      cleanupEventListeners()
    }
  }, [initEventListeners, initMediaSession, restoreLastSong, cleanupEventListeners])

  useHotkeys('space', () => {
    togglePlay()
    toast(isPlaying ? '已暂停' : '正在播放')
  }, { preventDefault: true, enableOnFormTags: false }, [togglePlay, isPlaying])
  
  useHotkeys('mod+left', () => playPrev(), { preventDefault: true, enableOnFormTags: false }, [playPrev])
  useHotkeys('mod+right', () => playNext(), { preventDefault: true, enableOnFormTags: false }, [playNext])
  
  useHotkeys('left', () => {
    if (currentSong) seek(Math.max(0, currentTime - 5))
  }, { preventDefault: true, enableOnFormTags: false }, [currentSong, currentTime, seek])
  
  useHotkeys('right', () => {
    if (currentSong) seek(Math.min(duration, currentTime + 5))
  }, { preventDefault: true, enableOnFormTags: false }, [currentSong, currentTime, duration, seek])
  
  useHotkeys('up', () => setVolume(Math.min(1, volume + 0.1)), { preventDefault: true, enableOnFormTags: false }, [volume, setVolume])
  useHotkeys('down', () => setVolume(Math.max(0, volume - 0.1)), { preventDefault: true, enableOnFormTags: false }, [volume, setVolume])

  const handleViewChange = useCallback((view: ViewType) => {
    setShowLyrics(false)
    if (view !== 'settings') {
      setPreviousView(view)
      previousViewRef.current = view
    }
    setCurrentView(view)
  }, [])

  const handleToggleSettings = useCallback(() => {
    setShowLyrics(false)
    setCurrentView(prev => {
      if (prev === 'settings') {
        return previousViewRef.current
      } else {
        previousViewRef.current = prev
        setPreviousView(prev)
        return 'settings'
      }
    })
  }, [])

  const handleToggleLyrics = useCallback(() => {
    setShowLyrics(prev => !prev)
  }, [])

  const renderView = () => {
    if (showLyrics) {
      return <LyricsView onClose={handleToggleLyrics} />
    }

    switch (currentView) {
      case 'liked':
        return <LikedView />
      case 'history':
        return <HistoryView />
      case 'local':
        return <LocalView />
      case 'hidden':
        return <HiddenView />
      case 'settings':
        return <SettingsView onClose={() => setCurrentView(previousView)} />
      default:
        return <LikedView />
    }
  }

  return (
    <div 
      className="h-screen flex flex-col text-white overflow-hidden transition-colors duration-700 select-none"
      style={{ backgroundColor: mainBgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}
    >
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          onToggleSettings={handleToggleSettings}
          bgColor={sidebarBgColor}
        />
        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>

      <PlayerBar onToggleLyrics={handleToggleLyrics} />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
            fontSize: '14px',
          },
        }}
      />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
