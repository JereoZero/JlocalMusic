import { useState, useMemo, useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import SongList from '../components/SongList'
import SongListHeader from '../components/SongListHeader'
import ViewHeader from '../components/ViewHeader'
import { useDebouncedValue, useSongSort, useMainBgColor } from '../hooks'
import { filterSongs } from '../utils/songUtils'
import type { Song } from '../types'

export default function LocalView() {
  const { songs, isLoading, refreshAll, likedPaths, hiddenPaths, toggleLike, toggleHidden } = useLibraryStore()
  const { currentSong, isPlaying, playSong } = usePlayerStore()
  const [searchInput, setSearchInput] = useState('')
  const bgColor = useMainBgColor()

  const searchQuery = useDebouncedValue(searchInput, 300)

  const visibleSongs = useMemo(() => {
    return songs.filter((song) => !hiddenPaths.has(song.path))
  }, [songs, hiddenPaths])

  const handlePlaySong = useCallback((song: Song) => {
    playSong(song, visibleSongs, 'local')
  }, [playSong, visibleSongs])

  const filteredSongs = useMemo(() => {
    return filterSongs(visibleSongs, searchQuery)
  }, [visibleSongs, searchQuery])

  const {
    sortedItems: filteredAndSortedSongs,
    titleSort,
    albumSort,
    handleTitleSort,
    handleAlbumSort,
    handleLikeSort,
  } = useSongSort(filteredSongs, likedPaths)

  return (
    <div className="h-full flex flex-col transition-colors duration-700 select-none" style={{ backgroundColor: bgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}>
      <ViewHeader
        title="本地"
        count={filteredAndSortedSongs.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onRefresh={refreshAll}
        isLoading={isLoading}
      />

      <SongListHeader
        onTitleSort={handleTitleSort}
        onAlbumSort={handleAlbumSort}
        onLikeSort={handleLikeSort}
        titleSort={titleSort}
        albumSort={albumSort}
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
          onToggleHidden={(path) => toggleHidden(path)}
          emptyTitle="暂无歌曲"
          emptyDescription="请添加音乐文件夹"
          source="local"
        />
      </div>
    </div>
  )
}
