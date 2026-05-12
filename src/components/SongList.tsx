import { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Heart, Eye } from 'lucide-react'
import type { Song } from '../types'
import type { QueueSource } from '../stores/playQueueStore'
import type { TitleSortType, AlbumSortType } from '../hooks'
import { cn } from '../utils/cn'
import { getSongListGridColumns, type SongListColumnConfig } from './songListColumns'
import SongItem from './SongItem'

function ClockIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
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
  showLikeButton?: boolean
  showHiddenButton?: boolean
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  source?: QueueSource
  showHeader?: boolean
  onTitleSort?: () => void
  onAlbumSort?: () => void
  titleSort?: TitleSortType
  albumSort?: AlbumSortType
}

function getSortIcon(sort?: TitleSortType | AlbumSortType) {
  if (!sort) return null
  if (sort.includes('-asc')) return '↑'
  if (sort.includes('-desc')) return '↓'
  return null
}

function SortButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      className={cn(
        'flex items-center gap-1.5 text-left transition-colors duration-200',
        'hover:text-zinc-300',
        disabled && 'cursor-default opacity-50',
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default function SongList({
  songs,
  currentSong,
  isPlaying,
  likedPaths,
  hiddenPaths,
  onPlay,
  onToggleLike,
  onToggleHidden,
  showLikeButton = true,
  showHiddenButton = true,
  emptyIcon,
  emptyTitle = '暂无歌曲',
  emptyDescription = '',
  source = 'local',
  showHeader = true,
  onTitleSort,
  onAlbumSort,
  titleSort = 'default',
  albumSort = 'default',
}: SongListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columnConfig: SongListColumnConfig = {
    showLike: showLikeButton,
    showHide: showHiddenButton,
  }

  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()

  const handlePlay = useCallback(
    (song: Song) => {
      onPlay(song, songs, source)
    },
    [onPlay, songs, source]
  )

  if (songs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600">
        {emptyIcon}
        <p className="text-lg mb-2 text-zinc-500">{emptyTitle}</p>
        {emptyDescription && <p className="text-sm text-zinc-600">{emptyDescription}</p>}
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-full flex flex-col overflow-hidden">
      {showHeader && (
        <div
          className="grid items-center px-6 py-3 text-xs font-medium text-zinc-600 uppercase tracking-wider border-b border-white/5 select-none flex-shrink-0"
          style={{
            gridTemplateColumns: getSongListGridColumns(columnConfig),
            gap: '16px',
          }}
        >
          <div className="flex justify-center items-center">#</div>

          <SortButton onClick={onTitleSort} disabled={!onTitleSort}>
            <span>标题</span>
            {getSortIcon(titleSort) && (
              <span className="text-zinc-500">{getSortIcon(titleSort)}</span>
            )}
          </SortButton>

          <SortButton onClick={onAlbumSort} disabled={!onAlbumSort} className="hidden md:flex">
            <span>专辑</span>
            {getSortIcon(albumSort) && (
              <span className="text-zinc-500">{getSortIcon(albumSort)}</span>
            )}
          </SortButton>

          {columnConfig.showLike && (
            <div className="flex justify-center">
              <Heart size={14} />
            </div>
          )}

          {columnConfig.showHide && (
            <div className="flex justify-center">
              <Eye size={14} />
            </div>
          )}

          <div className="flex justify-center items-center">
            <ClockIcon size={14} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
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
                  columnConfig={columnConfig}
                  onPlay={handlePlay}
                  onToggleLike={onToggleLike}
                  onToggleHidden={onToggleHidden}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}