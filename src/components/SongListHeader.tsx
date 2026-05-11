import { memo } from 'react'
import { Heart, Eye, Clock } from 'lucide-react'
import type { TitleSortType, AlbumSortType } from '../hooks'
import { cn } from '../utils/cn'
import { getSongListGridColumns, type SongListColumnConfig } from './songListColumns'

interface SongListHeaderProps {
  onTitleSort?: () => void
  onAlbumSort?: () => void
  onLikeSort?: () => void
  titleSort?: TitleSortType
  albumSort?: AlbumSortType
  showLikeColumn?: boolean
  showHideColumn?: boolean
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

function SongListHeader({
  onTitleSort,
  onAlbumSort,
  onLikeSort,
  titleSort = 'default',
  albumSort = 'default',
  showLikeColumn = true,
  showHideColumn = true,
}: SongListHeaderProps) {
  const columnConfig: SongListColumnConfig = {
    showLike: showLikeColumn,
    showHide: showHideColumn,
  }

  return (
    <div
      className="grid items-center px-6 py-3 text-xs font-medium text-zinc-600 uppercase tracking-wider border-b border-white/5 select-none"
      style={{
        gridTemplateColumns: getSongListGridColumns(columnConfig),
        gap: '16px',
      }}
    >
      {/* 序号 */}
      <div className="text-right">#</div>

      {/* 标题 */}
      <SortButton
        onClick={onTitleSort}
        disabled={!onTitleSort}
      >
        <span>标题</span>
        {getSortIcon(titleSort) && (
          <span className="text-zinc-500">{getSortIcon(titleSort)}</span>
        )}
      </SortButton>

      {/* 专辑 */}
      <SortButton
        onClick={onAlbumSort}
        disabled={!onAlbumSort}
        className="hidden md:flex"
      >
        <span>专辑</span>
        {getSortIcon(albumSort) && (
          <span className="text-zinc-500">{getSortIcon(albumSort)}</span>
        )}
      </SortButton>

      {/* 喜欢 */}
      {showLikeColumn && (
        <div className="flex justify-center">
          <Heart size={14} />
        </div>
      )}

      {/* 隐藏 */}
      {showHideColumn && (
        <div className="flex justify-center">
          <Eye size={14} />
        </div>
      )}

      {/* 时长 */}
      <div className="text-right">
        <Clock size={14} />
      </div>
    </div>
  )
}

export default memo(SongListHeader)
