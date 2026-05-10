import { memo, ReactNode, useCallback } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { hexToRgba } from '../config/themes'

interface ViewHeaderProps {
  title: string
  count?: number
  searchValue: string
  onSearchChange: (value: string) => void
  onRefresh?: () => void
  isLoading?: boolean
  searchPlaceholder?: string
  actions?: ReactNode
}

function ViewHeader({
  title,
  count,
  searchValue,
  onSearchChange,
  onRefresh,
  isLoading = false,
  searchPlaceholder = '搜索歌曲、歌手...',
  actions,
}: ViewHeaderProps) {
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const handleSearchFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.boxShadow = `0 0 0 2px ${hexToRgba(primaryColor, 0.5)}`
    },
    [primaryColor]
  )

  const handleSearchBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.boxShadow = 'none'
  }, [])

  return (
    <div className="px-6 py-4 flex items-center justify-between border-b border-[#2a2a2a]">
      <div className="flex items-end gap-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {count !== undefined && <span className="text-sm text-gray-400">{count} 首</span>}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors disabled:opacity-50 active:scale-95"
            style={{ color: undefined }}
            onMouseDown={(e) => {
              e.currentTarget.style.color = primaryColor
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af'
            }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-full bg-[#2a2a2a] text-white text-sm placeholder-gray-500 focus:outline-none w-64"
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
        </div>
      </div>
    </div>
  )
}

export default memo(ViewHeader)
