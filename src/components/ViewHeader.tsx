import { memo, ReactNode } from 'react'
import { RefreshCw, Search } from 'lucide-react'

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
  return (
    <div className="px-6 py-4 mt-8 flex items-center justify-between border-b border-[#2a2a2a]">
      <div className="flex items-end gap-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {count !== undefined && (
          <span className="text-sm text-gray-400">{count} 首</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors disabled:opacity-50 active:text-orange-500 active:scale-95"
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
            className="pl-10 pr-4 py-2 rounded-full bg-[#2a2a2a] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-64"
          />
        </div>
      </div>
    </div>
  )
}

export default memo(ViewHeader)
