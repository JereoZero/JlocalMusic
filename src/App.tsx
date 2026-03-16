import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import PlayerBar from './components/PlayerBar'
import ToastContainer from './components/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'
import LocalView from './views/LocalView'
import LikedView from './views/LikedView'
import HiddenView from './views/HiddenView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'
import LyricsView from './views/LyricsView'
import { usePlayerStore } from './stores/playerStore'
import { useLibraryStore } from './stores/libraryStore'
import { useToastStore } from './stores/toastStore'
import { useSongCover } from './hooks/useSongCover'
import { useAlbumColor } from './hooks/useAlbumColor'
import { useTheme } from './hooks/useTheme'
import * as api from './api/modules'
import type { ViewType } from './types'

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('liked')
  const [previousView, setPreviousView] = useState<ViewType>('liked')
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
  } = usePlayerStore()
  const { fetchSongs, fetchLikedPaths, fetchHiddenPaths } = useLibraryStore()
  const { info } = useToastStore()
  
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
      info('加载完成')
    }
    loadData()
  }, [fetchSongs, fetchLikedPaths, fetchHiddenPaths, info])

  useEffect(() => {
    initEventListeners()
    initMediaSession()
    restoreLastSong()

    const frontendVolume = usePlayerStore.getState().volume
    api.setVolume(frontendVolume).catch(() => {})
  }, [initEventListeners, initMediaSession, restoreLastSong])

  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        togglePlay()
        info(isPlaying ? '已暂停' : '正在播放')
        break
      case 'ArrowLeft':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          playPrev()
        } else if (currentSong) {
          e.preventDefault()
          const newTime = Math.max(0, currentTime - 5)
          seek(newTime)
        }
        break
      case 'ArrowRight':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          playNext()
        } else if (currentSong) {
          e.preventDefault()
          const newTime = Math.min(duration, currentTime + 5)
          seek(newTime)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        setVolume(Math.min(1, volume + 0.1))
        break
      case 'ArrowDown':
        e.preventDefault()
        setVolume(Math.max(0, volume - 0.1))
        break
    }
  }, [togglePlay, playNext, playPrev, seek, setVolume, isPlaying, currentSong, currentTime, duration, volume, info])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [handleKeyboardShortcuts])

  const handleViewChange = (view: ViewType) => {
    if (showLyrics) {
      setShowLyrics(false)
    }
    if (view !== 'settings') {
      setPreviousView(view)
    }
    setCurrentView(view)
  }

  const handleToggleSettings = () => {
    if (showLyrics) {
      setShowLyrics(false)
    }
    if (currentView === 'settings') {
      setCurrentView(previousView)
    } else {
      setPreviousView(currentView)
      setCurrentView('settings')
    }
  }

  const handleToggleLyrics = () => {
    setShowLyrics(!showLyrics)
  }

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

      <ToastContainer />
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
