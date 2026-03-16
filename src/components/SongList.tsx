import { useRef, memo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Heart, Eye, EyeOff, AlertCircle } from 'lucide-react'
import type { Song } from '../types'
import { formatDuration } from '../utils/format'
import { useSongCover } from '../hooks/useSongCover'
import { useThemeStore } from '../stores/themeStore'
import type { QueueSource } from '../stores/playQueueStore'

const SUPPORTED_FORMATS = ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'dsf', 'dff', 'dsd']

function isSupportedFormat(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop()
  return ext ? SUPPORTED_FORMATS.includes(ext) : false
}

interface SongListProps {
  songs: Song[]
  currentSong: Song | null
  isPlaying: boolean
  likedPaths: Set<string>
  hiddenPaths: Set<string>
  onPlay: (song: Song, queue: Song[], source: QueueSource) => void
  onToggleLike: (path: string) => void
  onToggleHidden: (path: string) => void
  showHiddenButton?: boolean
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  source?: QueueSource
}

interface SongItemProps {
  song: Song
  index: number
  isCurrent: boolean
  isPlaying: boolean
  isLiked: boolean
  isHidden: boolean
  showHiddenButton: boolean
  onPlay: (song: Song) => void
  onToggleLike: (path: string) => void
  onToggleHidden: (path: string) => void
}

const SongItem = memo(function SongItem({
  song,
  index,
  isCurrent,
  isPlaying: _isPlaying,
  isLiked,
  isHidden,
  showHiddenButton,
  onPlay,
  onToggleLike,
  onToggleHidden,
}: SongItemProps) {
  const { cover } = useSongCover(song.path)
  const isPlayable = isSupportedFormat(song.path)
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const handleToggleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleLike(song.path)
  }, [onToggleLike, song.path])

  const handleToggleHidden = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleHidden(song.path)
  }, [onToggleHidden, song.path])

  const handlePlay = useCallback((e: React.MouseEvent) => {
    if (!isPlayable) return
    e.stopPropagation()
    onPlay(song)
  }, [onPlay, song, isPlayable])

  return (
    <div
      className={`
        flex items-center px-4 py-2 gap-4
        hover:bg-white/5 transition-colors cursor-pointer group
        ${isCurrent ? 'bg-white/10' : ''}
        ${!isPlayable ? 'opacity-60' : ''}
      `}
      onDoubleClick={handlePlay}
      style={{ height: 56 }}
    >
      <div 
        className="w-8 text-right text-sm flex-shrink-0"
        style={{ color: isCurrent ? primaryColor : undefined }}
      >
        {isCurrent ? '' : index + 1}
      </div>

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#2a2a2a] select-none">
          {cover ? (
            <img
              src={`data:image/jpeg;base64,${cover}`}
              alt={song.title}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-[#3a3a3a] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5a5a5a]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div 
            className="font-medium truncate flex items-center gap-2"
            style={{ color: isCurrent ? primaryColor : undefined }}
          >
            <span>{song.title}</span>
            {!isPlayable && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                <AlertCircle size={12} />
                不支持播放
              </span>
            )}
          </div>
          <div className="text-sm text-gray-400 truncate">
            {song.artist || '未知歌手'}
          </div>
        </div>
      </div>

      <div className="w-32 flex-shrink-0 hidden md:block">
        <span className="text-sm text-gray-400 truncate">{song.album || '-'}</span>
      </div>

      <div className="w-10 flex-shrink-0 flex justify-center">
        <button
          onClick={handleToggleLike}
          className="p-2 rounded-full hover:bg-[#2a2a2a] transition-colors"
          title={isLiked ? '取消喜欢' : '添加到喜欢'}
        >
          <Heart
            size={16}
            style={{
              color: isLiked ? primaryColor : '#9ca3af',
              fill: isLiked ? primaryColor : 'none',
            }}
          />
        </button>
      </div>

      {showHiddenButton && (
        <div className="w-10 flex-shrink-0 flex justify-center">
          <button
            onClick={handleToggleHidden}
            className="p-2 rounded-full hover:bg-[#2a2a2a] transition-colors"
            title={isHidden ? '取消隐藏' : '隐藏歌曲'}
          >
            {isHidden ? (
              <EyeOff size={16} style={{ color: '#9ca3af' }} />
            ) : (
              <Eye size={16} style={{ color: '#9ca3af' }} />
            )}
          </button>
        </div>
      )}

      <div className="w-14 flex-shrink-0 text-right">
        <span className="text-sm text-gray-400">{formatDuration(song.duration)}</span>
      </div>
    </div>
  )
})

export default function SongList({
  songs,
  currentSong,
  isPlaying,
  likedPaths,
  hiddenPaths,
  onPlay,
  onToggleLike,
  onToggleHidden,
  showHiddenButton = true,
  emptyIcon,
  emptyTitle = '暂无歌曲',
  emptyDescription = '',
  source = 'local',
}: SongListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()

  const handlePlay = useCallback((song: Song) => {
    onPlay(song, songs, source)
  }, [onPlay, songs, source])

  if (songs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        {emptyIcon}
        <p className="text-lg mb-2">{emptyTitle}</p>
        {emptyDescription && <p className="text-sm">{emptyDescription}</p>}
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const song = songs[virtualRow.index]
          const isCurrent = currentSong?.path === song.path
          const isLiked = likedPaths.has(song.path)
          const isHidden = hiddenPaths.has(song.path)

          return (
            <div
              key={song.path}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SongItem
                song={song}
                index={virtualRow.index}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                isLiked={isLiked}
                isHidden={isHidden}
                showHiddenButton={showHiddenButton}
                onPlay={handlePlay}
                onToggleLike={onToggleLike}
                onToggleHidden={onToggleHidden}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
