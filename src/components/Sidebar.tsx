import { Heart, Music, EyeOff, Settings, History } from 'lucide-react'
import type { ViewType } from '../types'
import { APP_CONFIG } from '../config'
import { useThemeStore } from '../stores/themeStore'

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  onToggleSettings: () => void
  bgColor?: string
}

interface NavItemProps {
  icon: React.ElementType
  active: boolean
  onClick: () => void
  title: string
  primaryColor: string
}

function NavItem({ icon: Icon, active, onClick, title, primaryColor }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-full flex items-center justify-center px-2 py-3 rounded-lg transition-colors duration-200 select-none"
      style={{
        backgroundColor: active ? `${primaryColor}26` : 'transparent',
        color: active ? primaryColor : '#9ca3af',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#9ca3af'
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      <Icon size={24} />
    </button>
  )
}

export default function Sidebar({ currentView, onViewChange, onToggleSettings, bgColor }: SidebarProps) {
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()
  
  const navItems = [
    { id: 'liked' as ViewType, icon: Heart, title: '我喜欢' },
    { id: 'history' as ViewType, icon: History, title: '播放历史' },
    { id: 'local' as ViewType, icon: Music, title: '本地音乐' },
    { id: 'hidden' as ViewType, icon: EyeOff, title: '已隐藏' },
  ]

  return (
    <div 
      className="h-full flex flex-col p-3 w-20 transition-colors duration-700 select-none"
      style={{ backgroundColor: bgColor || '#121212', transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center justify-center py-4 mb-4">
        <span
          className="text-2xl font-bold tracking-wider"
          style={{ color: primaryColor }}
        >
          Only
        </span>
        <span className="text-[10px] text-gray-500 mt-3">{APP_CONFIG.version}</span>
      </div>

      {/* 主导航 */}
      <nav className="space-y-2 mb-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            active={currentView === item.id}
            onClick={() => onViewChange(item.id)}
            title={item.title}
            primaryColor={primaryColor}
          />
        ))}
      </nav>

      {/* 底部操作区 */}
      <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {/* 设置按钮 */}
        <NavItem
          icon={Settings}
          active={currentView === 'settings'}
          onClick={onToggleSettings}
          title="设置"
          primaryColor={primaryColor}
        />
      </div>
    </div>
  )
}
