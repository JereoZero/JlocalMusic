import { memo } from 'react'
import type { TitleSortType, AlbumSortType } from '../hooks'

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

function SongListHeader({
  onTitleSort,
  onAlbumSort,
  onLikeSort,
  titleSort = 'default',
  albumSort = 'default',
  showLikeColumn = true,
  showHideColumn = true,
}: SongListHeaderProps) {
  return (
    <div className="hidden grid grid-cols-[40px_40px_1fr_128px_40px_40px_48px] gap-x-4 items-center px-6 py-3 text-sm text-gray-400 border-b border-[#2a2a2a] bg-[#0a0a0a]">
      <div>#</div>
      <div></div>
      <button 
        className="flex items-center gap-2 hover:text-white text-left" 
        onClick={onTitleSort}
        disabled={!onTitleSort}
      >
        <span>标题</span>
        {getSortIcon(titleSort)}
      </button>
      <button 
        className="hidden md:flex items-center gap-2 hover:text-white text-left" 
        onClick={onAlbumSort}
        disabled={!onAlbumSort}
      >
        <span>专辑</span>
        {getSortIcon(albumSort)}
      </button>
      {showLikeColumn && (
        <button 
          className="flex justify-center hover:text-white" 
          onClick={onLikeSort} 
          title="按喜欢状态排序"
          disabled={!onLikeSort}
        >
          喜欢
        </button>
      )}
      {showHideColumn && (
        <div className="flex justify-center">隐藏</div>
      )}
      <div className="text-right pr-2">时长</div>
    </div>
  )
}

export default memo(SongListHeader)
