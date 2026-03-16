import { useState, useEffect, useMemo, useCallback } from 'react'
import { Music } from 'lucide-react'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import api from '../api'
import type { PlayHistory } from '../api'
import { playHistoryToSong } from '../utils/adapters'
import { filterByQuery } from '../utils/songUtils'
import SongList from '../components/SongList'
import SongListHeader from '../components/SongListHeader'
import ViewHeader from '../components/ViewHeader'
import { useSongSort, useMainBgColor } from '../hooks'
import { handleError } from '../utils/errorHandler'

export default function HistoryView() {
  const [playHistory, setPlayHistory] = useState<PlayHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const bgColor = useMainBgColor()

  const { currentSong, isPlaying, playSong } = usePlayerStore()
  const { likedPaths, hiddenPaths, toggleLike, toggleHidden } = useLibraryStore()

  const loadPlayHistory = async () => {
    setIsLoading(true)
    try {
      const data = await api.getPlayHistory(100)
      setPlayHistory(data)
    } catch (error) {
      handleError(error, '加载播放历史')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPlayHistory()
  }, [])

  const handlePlayFromHistory = useCallback(async (song: typeof filteredAndSortedSongs[0]) => {
    try {
      const songs = await api.searchSongs(song.path)
      if (songs && songs.length > 0) {
        await playSong(songs[0])
      } else {
        await api.playSong(song.path)
      }
    } catch (error) {
      console.error('Failed to play from history:', error)
      await api.playSong(song.path)
    }
  }, [playSong])

  const filteredHistory = useMemo(() => {
    const visibleHistory = playHistory.filter((item) => !hiddenPaths.has(item.path))
    return filterByQuery(visibleHistory, searchQuery).map(playHistoryToSong)
  }, [playHistory, searchQuery, hiddenPaths])

  const {
    sortedItems: filteredAndSortedSongs,
    titleSort,
    albumSort,
    handleTitleSort,
    handleAlbumSort,
  } = useSongSort(filteredHistory)

  return (
    <div className="h-full flex flex-col transition-colors duration-700 select-none" style={{ backgroundColor: bgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}>
      <ViewHeader
        title="播放历史"
        count={filteredAndSortedSongs.length}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={loadPlayHistory}
        isLoading={isLoading}
      />

      <SongListHeader
        onTitleSort={handleTitleSort}
        onAlbumSort={handleAlbumSort}
        titleSort={titleSort}
        albumSort={albumSort}
        showLikeColumn={false}
      />

      <div className="flex-1 overflow-y-auto px-6 py-2">
        <SongList
          songs={filteredAndSortedSongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          likedPaths={likedPaths}
          hiddenPaths={hiddenPaths}
          onPlay={handlePlayFromHistory}
          onToggleLike={toggleLike}
          onToggleHidden={toggleHidden}
          emptyIcon={<Music size={48} className="mb-4 opacity-50" />}
          emptyTitle="暂无播放历史"
          emptyDescription="播放歌曲后会自动记录"
        />
      </div>
    </div>
  )
}
