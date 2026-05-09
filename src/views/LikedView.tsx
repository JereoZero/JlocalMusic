import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { Heart, Play } from 'lucide-react'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import SongList from '../components/SongList'
import SongListHeader from '../components/SongListHeader'
import ViewHeader from '../components/ViewHeader'
import { useSongSort, useMainBgColor } from '../hooks'
import { filterSongs } from '../utils/songUtils'
import { hexToRgba } from '../config/themes'
import { useThemeStore } from '../stores/themeStore'
import type { Song } from '../types'

export default function LikedView() {
  const [searchQuery, setSearchQuery] = useState('')
  const bgColor = useMainBgColor()

  const { currentSong, isPlaying, playSong } = usePlayerStore()
  const { songs, isLoading, refreshAll, likedPaths, hiddenPaths, toggleLike, toggleHidden } = useLibraryStore(
  useShallow(s => ({
    songs: s.songs,
    isLoading: s.isLoading,
    likedPaths: s.likedPaths,
    hiddenPaths: s.hiddenPaths,
    refreshAll: s.refreshAll,
    toggleLike: s.toggleLike,
    toggleHidden: s.toggleHidden,
  }))
)

  const likedSongs = useMemo(() => {
    return songs.filter(song => likedPaths.has(song.path) && !hiddenPaths.has(song.path))
  }, [songs, likedPaths, hiddenPaths])

  const filteredSongs = useMemo(() => {
    return filterSongs(likedSongs, searchQuery)
  }, [likedSongs, searchQuery])

  const {
    sortedItems: filteredAndSortedSongs,
    titleSort,
    albumSort,
    handleTitleSort,
    handleAlbumSort,
  } = useSongSort(filteredSongs, undefined, 'liked')

  const handlePlaySong = useCallback((song: Song) => {
    playSong(song, likedSongs, 'liked')
  }, [playSong, likedSongs])

  const handlePlayAll = useCallback(() => {
    if (likedSongs.length > 0) {
      playSong(likedSongs[0], likedSongs, 'liked')
    }
  }, [playSong, likedSongs])

  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  return (
    <div className="h-full flex flex-col transition-colors duration-700 select-none" style={{ backgroundColor: bgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}>
      <ViewHeader
        title="我喜欢"
        count={likedSongs.length}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refreshAll}
        isLoading={isLoading}
        actions={
          likedSongs.length > 0 ? (
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors active:scale-95"
              style={{
                backgroundColor: hexToRgba(primaryColor, 0.2),
                color: primaryColor,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(primaryColor, 0.3) }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(primaryColor, 0.2) }}
            >
              <Play size={14} className="fill-current" />
              播放全部
            </button>
          ) : null
        }
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
          onPlay={handlePlaySong}
          onToggleLike={toggleLike}
          onToggleHidden={toggleHidden}
          emptyIcon={<Heart size={48} className="mb-4 opacity-50" />}
          emptyTitle="暂无喜欢的歌曲"
          emptyDescription="点击歌曲旁边的爱心图标添加到我喜欢"
          source="liked"
        />
      </div>
    </div>
  )
}