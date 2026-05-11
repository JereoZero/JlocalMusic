import { useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerSettingsStore, usePlayQueueStore } from '../stores/playQueueStore'
import { useThemeStore } from '../stores/themeStore'
import { ProgressBar, VolumeControl, PlaybackControls } from './player'
import { useSongCover } from '../hooks/useSongCover'
import { useAlbumColor } from '../hooks/useAlbumColor'
import { Heart, Eye, EyeOff } from 'lucide-react'
import type { PlayMode } from '../types'
import { cn } from '../utils/cn'
import { motion } from 'framer-motion'

export default function PlayerBar({ onToggleLyrics }: { onToggleLyrics?: () => void }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
  } = usePlayerStore()

  const { likedPaths, hiddenPaths, toggleLike, toggleHidden } = useLibraryStore(
    useShallow((s) => ({
      likedPaths: s.likedPaths,
      hiddenPaths: s.hiddenPaths,
      toggleLike: s.toggleLike,
      toggleHidden: s.toggleHidden,
    }))
  )
  const { settings } = usePlayerSettingsStore()
  const { toggleShuffle } = usePlayQueueStore()
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const playMode = settings.playMode
  const isLiked = currentSong ? likedPaths.has(currentSong.path) : false
  const isHidden = currentSong ? hiddenPaths.has(currentSong.path) : false
  const songDuration = duration || currentSong?.duration || 0
  const { cover } = useSongCover(currentSong?.path)
  const albumColors = useAlbumColor(cover, currentSong?.path)

  const playerBarBg = albumColors.playerBar || '#181818'

  const handleTogglePlayMode = useCallback(() => {
    const modes: PlayMode[] = ['list', 'loop', 'shuffle']
    const currentIndex = modes.indexOf(playMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]

    if (nextMode === 'shuffle' && playMode !== 'shuffle') {
      toggleShuffle()
    } else if (playMode === 'shuffle' && nextMode !== 'shuffle') {
      toggleShuffle()
    } else {
      usePlayerSettingsStore.getState().setPlayMode(nextMode)
    }
  }, [playMode, toggleShuffle])

  return (
    <div
      className="h-20 px-5 flex items-center justify-between border-t border-white/5 transition-colors duration-700"
      style={{
        backgroundColor: playerBarBg,
        transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)',
      }}
    >
      {/* 左侧：歌曲信息 */}
      <div className="w-1/3 flex items-center gap-3 min-w-0">
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer bg-white/5"
          onClick={onToggleLyrics}
        >
          {cover ? (
            <img
              src={`data:image/jpeg;base64,${cover}`}
              alt={currentSong?.title || ''}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {currentSong?.title || '未在播放'}
          </p>
          <p className="text-xs truncate text-zinc-500">{currentSong?.artist || ''}</p>
        </div>
      </div>

      {/* 中间：播放控制 + 进度条 */}
      <div className="w-1/3 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <PlaybackControls
            isPlaying={isPlaying}
            playMode={playMode}
            onTogglePlay={togglePlay}
            onPlayPrev={playPrev}
            onPlayNext={playNext}
            onTogglePlayMode={handleTogglePlayMode}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => currentSong && toggleLike(currentSong.path)}
            className={cn(
              'p-2 rounded-full transition-colors duration-200',
              'hover:bg-white/5'
            )}
            style={{ color: isLiked ? primaryColor : '#71717a' }}
          >
            <Heart size={18} fill={isLiked ? primaryColor : 'none'} />
          </motion.button>
        </div>
        <ProgressBar currentTime={currentTime} duration={songDuration} onSeek={seek} />
      </div>

      {/* 右侧：隐藏按钮 + 音量 */}
      <div className="w-1/3 flex items-center justify-end gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => currentSong && toggleHidden(currentSong.path)}
          className={cn(
            'p-2 rounded-full transition-colors duration-200',
            'text-zinc-500 hover:text-white hover:bg-white/5'
          )}
          title={isHidden ? '取消隐藏' : '隐藏歌曲'}
        >
          {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </motion.button>
        <VolumeControl volume={volume} onVolumeChange={setVolume} />
      </div>
    </div>
  )
}
