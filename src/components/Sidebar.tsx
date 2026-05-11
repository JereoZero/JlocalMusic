import { Heart, Music, EyeOff, Settings, History } from 'lucide-react'
import type { ViewType } from '../types'
import { APP_CONFIG } from '../config'
import { useThemeStore } from '../stores/themeStore'
import { cn } from '../utils/cn'

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  onToggleSettings: () => void
  bgColor?: string
}

interface NavItemProps {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
  primaryColor: string
}

function NavItem({ icon: Icon, label, active, onClick, primaryColor }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 rounded-xl',
        'transition-all duration-200 select-none',
        'hover:text-white',
        active
          ? 'font-semibold'
          : 'text-zinc-400 hover:bg-white/5'
      )}
      style={
        active
          ? {
              backgroundColor: `${primaryColor}18`,
              color: primaryColor,
            }
          : undefined
      }
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[15px]">{label}</span>
      {active && (
        <div
          className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        />
      )}
    </button>
  )
}

export default function Sidebar({
  currentView,
  onViewChange,
  onToggleSettings,
  bgColor,
}: SidebarProps) {
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const navItems = [
    { id: 'liked' as ViewType, icon: Heart, label: '我喜欢' },
    { id: 'history' as ViewType, icon: History, label: '播放历史' },
    { id: 'local' as ViewType, icon: Music, label: '本地音乐' },
    { id: 'hidden' as ViewType, icon: EyeOff, label: '已隐藏' },
  ]

  return (
    <div
      className="h-full flex flex-col p-3 w-48 transition-colors duration-700 select-none"
      style={{
        backgroundColor: bgColor || '#121212',
        transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-5 mb-3">
        <img
          src="/logo.png"
          alt="Jlocal"
          className="w-10 h-10 object-contain rounded-xl"
          draggable={false}
        />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white tracking-tight">Jlocal</span>
          <span className="text-xs text-zinc-500">{APP_CONFIG.version}</span>
        </div>
      </div>

      {/* 主导航 */}
      <nav className="space-y-0.5 mb-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            onClick={() => onViewChange(item.id)}
            primaryColor={primaryColor}
          />
        ))}
      </nav>

      {/* 底部操作区 */}
      <div className="pt-3 border-t border-white/5">
        <NavItem
          icon={Settings}
          label="设置"
          active={currentView === 'settings'}
          onClick={onToggleSettings}
          primaryColor={primaryColor}
        />
      </div>
    </div>
  )
}
