import { useState, useMemo } from 'react'
import { EyeOff } from 'lucide-react'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import SongList from '../components/SongList'
import SongListHeader from '../components/SongListHeader'
import ViewHeader from '../components/ViewHeader'
import { useSongSort, useMainBgColor } from '../hooks'
import { filterSongs } from '../utils/songUtils'

export default function HiddenView() {
  const [searchQuery, setSearchQuery] = useState('')
  const bgColor = useMainBgColor()

  const { currentSong, isPlaying, playSong } = usePlayerStore()
  const { songs, isLoading, refreshAll, likedPaths, hiddenPaths, toggleLikeWithContext, toggleHidden } = useLibraryStore()

  const hiddenSongs = useMemo(() => {
    return songs.filter(song => hiddenPaths.has(song.path))
  }, [songs, hiddenPaths])

  const filteredSongs = useMemo(() => {
    return filterSongs(hiddenSongs, searchQuery)
  }, [hiddenSongs, searchQuery])

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
        title="已隐藏"
        count={filteredAndSortedSongs.length}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refreshAll}
        isLoading={isLoading}
      />

      <div className="px-6 py-3 border-b border-[#2a2a2a] bg-white/5">
        <p className="text-sm text-gray-400">
          隐藏的歌曲不会显示在本地音乐列表中。点击取消隐藏按钮可将歌曲移回本地音乐。
        </p>
      </div>

      <SongListHeader
        onTitleSort={handleTitleSort}
        onAlbumSort={handleAlbumSort}
        titleSort={titleSort}
        albumSort={albumSort}
        showLikeColumn={false}
        showHideColumn={false}
      />

      <div className="flex-1 overflow-y-auto px-6 py-2">
        <SongList
          songs={filteredAndSortedSongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          likedPaths={likedPaths}
          hiddenPaths={hiddenPaths}
          onPlay={playSong}
          onToggleLike={(path) => toggleLikeWithContext(path, 'hidden')}
          onToggleHidden={toggleHidden}
          emptyIcon={<EyeOff size={48} className="mb-4 opacity-50" />}
          emptyTitle="暂无隐藏的歌曲"
          emptyDescription="在本地音乐中点击隐藏按钮可将歌曲移到这里"
        />
      </div>
    </div>
  )
}
