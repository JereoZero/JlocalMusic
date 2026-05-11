import { useRef, memo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Heart, Eye, EyeOff, AlertCircle, Play } from 'lucide-react'
import type { Song } from '../types'
import { formatDuration } from '../utils/format'
import { useSongCover } from '../hooks/useSongCover'
import { useThemeStore } from '../stores/themeStore'
import { AUDIO_FORMATS } from '../constants'
import type { QueueSource } from '../stores/playQueueStore'
import type { TitleSortType, AlbumSortType } from '../hooks'
import { cn } from '../utils/cn'
import { motion } from 'framer-motion'
import { getSongListGridColumns, type SongListColumnConfig } from './songListColumns'

const SUPPORTED_FORMATS: Set<string> = new Set(
  AUDIO_FORMATS.normal.filter((f) => !AUDIO_FORMATS.unsupported.includes(f as any))
)

function isSupportedFormat(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop()
  return ext ? SUPPORTED_FORMATS.has(ext) : false
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

interface SongItemProps {
  song: Song
  index: number
  isCurrent: boolean
  isPlaying: boolean
  isLiked: boolean
  isHidden: boolean
  columnConfig: SongListColumnConfig
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
  columnConfig,
  onPlay,
  onToggleLike,
  onToggleHidden,
}: SongItemProps) {
  const { cover } = useSongCover(song.path)
  const isPlayable = isSupportedFormat(song.path)
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const handleToggleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleLike(song.path)
    },
    [onToggleLike, song.path]
  )

  const handleToggleHidden = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleHidden(song.path)
    },
    [onToggleHidden, song.path]
  )

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      if (!isPlayable) return
      e.stopPropagation()
      onPlay(song)
    },
    [onPlay, song, isPlayable]
  )

  return (
    <div
      className={cn(
        'group grid items-center px-6 py-2',
        'rounded-lg transition-all duration-200 cursor-pointer',
        'hover:bg-white/[0.04]',
        isCurrent && 'bg-white/[0.08]',
        !isPlayable && 'opacity-50'
      )}
      style={{
        height: 56,
        gridTemplateColumns: getSongListGridColumns(columnConfig),
        gap: '16px',
      }}
      onDoubleClick={handlePlay}
    >
      {/* 序号 / 播放指示 */}
      <div className="flex justify-center items-center text-sm tabular-nums">
        {isCurrent ? (
          <div className="flex items-center justify-end gap-0.5">
            <motion.div
              animate={{ scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              className="w-0.5 h-3 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <motion.div
              animate={{ scaleY: [0.6, 1, 0.6] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
              className="w-0.5 h-3 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <motion.div
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: 0.2 }}
              className="w-0.5 h-3 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        ) : (
          <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
            {index + 1}
          </span>
        )}
      </div>

      {/* 封面 + 歌曲信息 */}
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        <div className="relative w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-white/5 group-hover:shadow-md transition-shadow">
          {cover ? (
            <img
              src={`data:image/jpeg;base64,${cover}`}
              alt={song.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={16} className="text-white ml-0.5" />
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="font-medium text-sm truncate flex items-center gap-2">
            <span style={{ color: isCurrent ? primaryColor : undefined }}>{song.title}</span>
            {!isPlayable && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md flex-shrink-0">
                <AlertCircle size={12} />
                不支持
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-500 truncate">{song.artist || '未知歌手'}</div>
        </div>
      </div>

      {/* 专辑 */}
      <div className="hidden md:block overflow-hidden">
        <span className="text-sm text-zinc-600 truncate block">{song.album || '-'}</span>
      </div>

      {/* 喜欢按钮 */}
      {columnConfig.showLike && (
        <div className="flex justify-center">
          <button
            onClick={handleToggleLike}
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              'hover:bg-white/5 opacity-0 group-hover:opacity-100',
              isLiked && 'opacity-100'
            )}
            title={isLiked ? '取消喜欢' : '添加到喜欢'}
          >
            <Heart
              size={16}
              style={{
                color: isLiked ? primaryColor : '#71717a',
                fill: isLiked ? primaryColor : 'none',
              }}
            />
          </button>
        </div>
      )}

      {/* 隐藏按钮 */}
      {columnConfig.showHide && (
        <div className="flex justify-center">
          <button
            onClick={handleToggleHidden}
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              'hover:bg-white/5 opacity-0 group-hover:opacity-100',
              isHidden && 'opacity-100'
            )}
            title={isHidden ? '取消隐藏' : '隐藏歌曲'}
          >
            {isHidden ? (
              <EyeOff size={16} className="text-zinc-500" />
            ) : (
              <Eye size={16} className="text-zinc-500" />
            )}
          </button>
        </div>
      )}

      {/* 时长 */}
      <div className="flex justify-center items-center">
        <span className="text-sm text-zinc-600 tabular-nums">{formatDuration(song.duration)}</span>
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
          {/* 序号 */}
          <div className="flex justify-center items-center">#</div>

          {/* 标题 */}
          <SortButton onClick={onTitleSort} disabled={!onTitleSort}>
            <span>标题</span>
            {getSortIcon(titleSort) && (
              <span className="text-zinc-500">{getSortIcon(titleSort)}</span>
            )}
          </SortButton>

          {/* 专辑 */}
          <SortButton onClick={onAlbumSort} disabled={!onAlbumSort} className="hidden md:flex">
            <span>专辑</span>
            {getSortIcon(albumSort) && (
              <span className="text-zinc-500">{getSortIcon(albumSort)}</span>
            )}
          </SortButton>

          {/* 喜欢 */}
          {columnConfig.showLike && (
            <div className="flex justify-center">
              <Heart size={14} />
            </div>
          )}

          {/* 隐藏 */}
          {columnConfig.showHide && (
            <div className="flex justify-center">
              <Eye size={14} />
            </div>
          )}

          {/* 时长 */}
          <div className="flex justify-center items-center">
            <Clock size={14} />
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

function Clock({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
}
