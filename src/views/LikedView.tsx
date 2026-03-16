import { useState, useMemo } from 'react'
import { Heart } from 'lucide-react'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import SongList from '../components/SongList'
import SongListHeader from '../components/SongListHeader'
import ViewHeader from '../components/ViewHeader'
import { useSongSort, useMainBgColor } from '../hooks'
import { filterSongs } from '../utils/songUtils'

export default function LikedView() {
  const [searchQuery, setSearchQuery] = useState('')
  const bgColor = useMainBgColor()

  const { currentSong, isPlaying, playSong } = usePlayerStore()
  const { songs, isLoading, refreshAll, likedPaths, hiddenPaths, toggleLike, toggleHiddenWithContext } = useLibraryStore()

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
  } = useSongSort(filteredSongs)

  return (
    <div className="h-full flex flex-col transition-colors duration-700 select-none" style={{ backgroundColor: bgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}>
      <ViewHeader
        title="我喜欢"
        count={filteredAndSortedSongs.length}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refreshAll}
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
          onPlay={playSong}
          onToggleLike={toggleLike}
          onToggleHidden={(path) => toggleHiddenWithContext(path, 'liked')}
          emptyIcon={<Heart size={48} className="mb-4 opacity-50" />}
          emptyTitle="暂无喜欢的歌曲"
          emptyDescription="点击歌曲旁边的爱心图标添加到我喜欢"
          source="liked"
        />
      </div>
    </div>
  )
}
