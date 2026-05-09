import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import type { PlayMode } from '../../types'
import { useThemeStore } from '../../stores/themeStore'
import { getPlayModeIcon, getPlayModeTitle } from './playModeUtils'

interface PlaybackControlsProps {
  isPlaying: boolean
  playMode: PlayMode
  onTogglePlay: () => void
  onPlayPrev: () => void
  onPlayNext: () => void
  onTogglePlayMode: () => void
}

export default function PlaybackControls({
  isPlaying,
  playMode,
  onTogglePlay,
  onPlayPrev,
  onPlayNext,
  onTogglePlayMode,
}: PlaybackControlsProps) {
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onTogglePlayMode}
        className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 text-[#9ca3af]"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = primaryColor
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af'
        }}
        title={getPlayModeTitle(playMode)}
      >
        {getPlayModeIcon(playMode)}
      </button>
      <button
        onClick={onPlayPrev}
        className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 text-[#9ca3af]"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = primaryColor
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af'
        }}
      >
        <SkipBack size={20} />
      </button>
      <button
        onClick={onTogglePlay}
        className="p-3 rounded-full transition-colors"
        style={{ backgroundColor: primaryColor }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
      >
        <span className="block w-5 h-5 flex items-center justify-center">
          {isPlaying ? (
            <Pause size={20} className="text-white" />
          ) : (
            <Play size={20} className="text-white ml-0.5" />
          )}
        </span>
      </button>
      <button
        onClick={onPlayNext}
        className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 text-[#9ca3af]"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = primaryColor
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af'
        }}
      >
        <SkipForward size={20} />
      </button>
    </div>
  )
}
