import { useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerSettingsStore, usePlayQueueStore } from '../stores/playQueueStore'
import { useThemeStore } from '../stores/themeStore'
import { ProgressBar, VolumeControl, PlaybackControls } from './player'
import { useSongCover } from '../hooks/useSongCover'
import { useAlbumColor } from '../hooks/useAlbumColor'
import { Heart, Eye, EyeOff } from 'lucide-react'
import type { PlayMode } from '../types'

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
    setVolume 
  } = usePlayerStore()
  
  const { likedPaths, hiddenPaths, toggleLike, toggleHidden } = useLibraryStore()
  const { settings, setPlayMode } = usePlayerSettingsStore()
  const { shuffleQueue, unshuffleQueue } = usePlayQueueStore()
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const playMode = settings.playMode
  const isLiked = currentSong ? likedPaths.has(currentSong.path) : false
  const isHidden = currentSong ? hiddenPaths.has(currentSong.path) : false
  const songDuration = duration || currentSong?.duration || 0
  const { cover } = useSongCover(currentSong?.path)
  const albumColors = useAlbumColor(cover, currentSong?.path)
  
  // PlayerBar 使用更暗的背景（亮度 10%）
  const playerBarBg = albumColors.playerBar || '#181818'

  const handleTogglePlayMode = useCallback(() => {
    const modes: PlayMode[] = ['list', 'loop', 'shuffle']
    const currentIndex = modes.indexOf(playMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    
    if (nextMode === 'shuffle' && playMode !== 'shuffle') {
      shuffleQueue()
    } else if (playMode === 'shuffle' && nextMode !== 'shuffle') {
      unshuffleQueue()
    }
    
    setPlayMode(nextMode)
  }, [playMode, setPlayMode, shuffleQueue, unshuffleQueue])

  return (
    <div 
      className="h-20 px-4 flex items-center justify-between border-t border-[#2a2a2a] transition-colors duration-700"
      style={{ backgroundColor: playerBarBg, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}
    >
      {/* 左侧：歌曲信息 */}
      <div className="w-1/3 flex items-center gap-3">
        <div
          className="w-14 h-14 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-[#2a2a2a] select-none"
          onClick={onToggleLyrics}
        >
          {cover ? (
            <img
              src={`data:image/jpeg;base64,${cover}`}
              alt={currentSong?.title || ''}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-[#3a3a3a] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#5a5a5a]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {currentSong?.title || '未在播放'}
          </p>
          <p className="text-xs truncate text-gray-400">
            {currentSong?.artist || ''}
          </p>
        </div>
      </div>

      {/* 中间：播放控制 + 进度条 */}
      <div className="w-1/3 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <PlaybackControls
            isPlaying={isPlaying}
            playMode={playMode}
            onTogglePlay={togglePlay}
            onPlayPrev={playPrev}
            onPlayNext={playNext}
            onTogglePlayMode={handleTogglePlayMode}
          />
          {/* 喜欢按钮在下一首右边 */}
          <button
            onClick={() => currentSong && toggleLike(currentSong.path)}
            className="p-2 rounded-full transition-all duration-200 hover:bg-white/10"
            style={{
              color: isLiked ? primaryColor : '#9ca3af',
            }}
          >
            <Heart size={18} fill={isLiked ? primaryColor : 'none'} />
          </button>
        </div>
        <ProgressBar
          currentTime={currentTime}
          duration={songDuration}
          onSeek={seek}
        />
      </div>

      {/* 右侧：隐藏按钮 + 音量 */}
      <div className="w-1/3 flex items-center justify-end gap-2">
        {/* 隐藏按钮在音量左边 */}
        <button
          onClick={() => currentSong && toggleHidden(currentSong.path)}
          className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 text-[#9ca3af]"
          title={isHidden ? '取消隐藏' : '隐藏歌曲'}
        >
          {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        <VolumeControl
          volume={volume}
          onVolumeChange={setVolume}
        />
      </div>
    </div>
  )
}
