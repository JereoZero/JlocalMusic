import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import type { PlayMode } from '../../types'
import { useThemeStore } from '../../stores/themeStore'
import { getPlayModeIcon, getPlayModeTitle } from './playModeUtils'
import { cn } from '../../utils/cn'
import { motion } from 'framer-motion'

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

  const iconButtonClass = cn(
    'p-2 rounded-full transition-all duration-200',
    'text-zinc-500 hover:text-white hover:bg-white/5',
    'active:scale-90'
  )

  return (
    <div className="flex items-center gap-1">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onTogglePlayMode}
        className={iconButtonClass}
        title={getPlayModeTitle(playMode)}
      >
        {getPlayModeIcon(playMode)}
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onPlayPrev}
        className={iconButtonClass}
      >
        <SkipBack size={20} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onTogglePlay}
        className={cn(
          'p-3 rounded-full transition-all duration-200',
          'shadow-lg hover:shadow-xl hover:brightness-110'
        )}
        style={{ backgroundColor: primaryColor }}
      >
        <span className="block w-5 h-5 flex items-center justify-center">
          {isPlaying ? (
            <Pause size={20} className="text-white" />
          ) : (
            <Play size={20} className="text-white ml-0.5" />
          )}
        </span>
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onPlayNext}
        className={iconButtonClass}
      >
        <SkipForward size={20} />
      </motion.button>
    </div>
  )
}
