import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import SongList from '../components/SongList'
import ViewHeader from '../components/ViewHeader'
import { useDebouncedValue, useSongSort, useMainBgColor } from '../hooks'
import { filterSongs } from '../utils/songUtils'
import type { Song } from '../types'

export default function LocalView() {
  const { songs, isLoading, refreshAll, likedPaths, hiddenPaths, toggleLike, toggleHidden } =
    useLibraryStore(
      useShallow((s) => ({
        songs: s.songs,
        isLoading: s.isLoading,
        likedPaths: s.likedPaths,
        hiddenPaths: s.hiddenPaths,
        refreshAll: s.refreshAll,
        toggleLike: s.toggleLike,
        toggleHidden: s.toggleHidden,
      }))
    )
  const { currentSong, isPlaying, playSong } = usePlayerStore()
  const [searchInput, setSearchInput] = useState('')
  const bgColor = useMainBgColor()

  const searchQuery = useDebouncedValue(searchInput, 300)

  const visibleSongs = useMemo(() => {
    return songs.filter((song) => !hiddenPaths.has(song.path))
  }, [songs, hiddenPaths])

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
  } = useSongSort(filteredSongs, likedPaths, 'local')

  const handlePlaySong = useCallback(
    (song: Song) => {
      playSong(song, filteredAndSortedSongs, 'local')
    },
    [playSong, filteredAndSortedSongs]
  )

  return (
    <div
      className="h-full flex flex-col transition-colors duration-700 select-none"
      style={{
        backgroundColor: bgColor,
        transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)',
      }}
    >
      <ViewHeader
        title="本地"
        count={filteredAndSortedSongs.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onRefresh={refreshAll}
        isLoading={isLoading}
      />

      <SongList
        songs={filteredAndSortedSongs}
        currentSong={currentSong}
        isPlaying={isPlaying}
        likedPaths={likedPaths}
        hiddenPaths={hiddenPaths}
        onPlay={handlePlaySong}
        onToggleLike={toggleLike}
        onToggleHidden={toggleHidden}
        showHeader
        onTitleSort={handleTitleSort}
        onAlbumSort={handleAlbumSort}
        onLikeSort={handleLikeSort}
        titleSort={titleSort}
        albumSort={albumSort}
        emptyTitle="暂无歌曲"
        emptyDescription="请添加音乐文件夹"
        source="local"
      />
    </div>
  )
}
