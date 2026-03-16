import { X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useThemeStore } from '../stores/themeStore'
import api from '../api'
import { useSongCover } from '../hooks/useSongCover'
import { useAlbumColor } from '../hooks/useAlbumColor'
import LyricParser from 'lrc-file-parser'

interface LyricsViewProps {
  onClose: () => void
}

interface LyricLine {
  time: number
  text: string
}

export default function LyricsView({ onClose }: LyricsViewProps) {
  const currentSong = usePlayerStore((state) => state.currentSong)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const seek = usePlayerStore((state) => state.seek)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [isMouseOverLyrics, setIsMouseOverLyrics] = useState(false)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const currentLineRef = useRef<HTMLDivElement>(null)
  const lyricParserRef = useRef<LyricParser | null>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const { cover: coverBase64 } = useSongCover(currentSong?.path)
  const albumColors = useAlbumColor(coverBase64, currentSong?.path)
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  useEffect(() => {
    setIsPaused(!isPlaying)
  }, [isPlaying])

  useEffect(() => {
    if (!currentSong) {
      setLyricLines([])
      return
    }

    setIsLoading(true)
    api.getLyrics(currentSong.path)
      .then((source) => {
        if (source?.content) {
          if (lyricParserRef.current) {
            lyricParserRef.current.pause()
          }

          lyricParserRef.current = new LyricParser({
            onPlay: () => {},
            onSetLyric: (lines: LyricLine[]) => {
              setLyricLines(lines)
            },
            offset: 100,
            isRemoveBlankLine: true,
          })

          lyricParserRef.current.setLyric(source.content)
        } else {
          setLyricLines([])
        }
      })
      .catch(() => setLyricLines([]))
      .finally(() => setIsLoading(false))

    return () => {
      if (lyricParserRef.current) {
        lyricParserRef.current.pause()
      }
    }
  }, [currentSong?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentLineIndex = useCallback(() => {
    if (!lyricLines.length) return -1

    const timeMs = currentTime * 1000
    let index = -1

    for (let i = 0; i < lyricLines.length; i++) {
      if (lyricLines[i].time <= timeMs) {
        index = i
      } else {
        break
      }
    }

    return index
  }, [lyricLines, currentTime])

  const lineIndex = currentLineIndex()

  useEffect(() => {
    if (lyricParserRef.current && lyricLines.length > 0) {
      const timeMs = currentTime * 1000
      lyricParserRef.current.play(timeMs)
    }
  }, [currentTime, lyricLines])

  useEffect(() => {
    // 用户滚动时不自动滚动
    if (isUserScrolling) return
    
    if (currentLineRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current
      const line = currentLineRef.current

      const containerRect = container.getBoundingClientRect()
      const lineRect = line.getBoundingClientRect()

      const lineCenter = lineRect.top + lineRect.height / 2
      const containerCenter = containerRect.top + containerRect.height / 2

      const scrollOffset = lineCenter - containerCenter
      const newScrollTop = container.scrollTop + scrollOffset

      container.scrollTo({
        top: newScrollTop,
        behavior: 'smooth'
      })
    }
  }, [lineIndex, isUserScrolling])

  const handleLineClick = useCallback((line: LyricLine) => {
    const time = line.time / 1000
    seek(time).catch(() => {})
  }, [seek])

  const handleCoverClick = useCallback(async () => {
    await togglePlay()
  }, [togglePlay])

  // 用户滚动处理
  const handleScroll = useCallback(() => {
    setIsUserScrolling(true)
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // 2秒后恢复自动滚动
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false)
    }, 2000)
  }, [])

  // 鼠标进入歌词区域
  const handleMouseEnter = useCallback(() => {
    setIsMouseOverLyrics(true)
  }, [])

  // 鼠标离开歌词区域
  const handleMouseLeave = useCallback(() => {
    setIsMouseOverLyrics(false)
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#181818] text-gray-500">
        <p>暂无歌曲</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
        >
          返回
        </button>
      </div>
    )
  }

  const title = currentSong.title || '未知歌曲'
  const artist = currentSong.artist || '未知歌手'
  const album = currentSong.album || '未知专辑'

  // 背景颜色：使用专辑色调或默认深色
  const bgColor = albumColors.lyrics || '#181818'

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* 动态背景层 */}
      <div 
        className="absolute inset-0 transition-all duration-700"
        style={{ backgroundColor: bgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}
      />
      
      {/* 内容层 */}
      <div className="relative h-full w-full flex">
        {/* 最左侧功能栏点击区域 - 退出歌词 */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-16 z-20 cursor-pointer"
          onClick={onClose}
          title="点击返回"
        />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-30"
        >
          <X size={24} className="text-gray-400 hover:text-white" />
        </button>

        {/* 左侧专辑区域 */}
        <div className="w-[35%] h-full flex flex-col items-center justify-center px-8 z-10 ml-8">
          <div className="flex flex-col items-center gap-4">
            {/* 专辑封面 - 点击暂停/播放 */}
            <div
              className="rounded-lg overflow-hidden bg-[#2a2a2a] flex items-center justify-center cursor-pointer select-none"
              style={{ 
                width: isPaused ? '200px' : '280px', 
                height: isPaused ? '200px' : '280px',
                transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onClick={handleCoverClick}
              title={isPaused ? '点击播放' : '点击暂停'}
            >
              {coverBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${coverBase64}`}
                  alt={title}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-[#3a3a3a] flex items-center justify-center">
                  <svg className="w-20 h-20 text-[#5a5a5a]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* 歌曲信息 - 固定大小 */}
            <div className="text-center" style={{ width: '280px' }}>
              <h2 className="text-xl font-bold text-white mb-2 truncate">
                {title}
              </h2>
              <p className="text-sm text-gray-400 mb-1 truncate">
                专辑：{album}
              </p>
              <p className="text-sm text-gray-400 truncate">
                歌手：{artist}
              </p>
              {/* 暂停时显示横线 */}
              {isPaused && (
                <div className="mt-4 w-12 h-0.5 mx-auto rounded" style={{ backgroundColor: primaryColor }} />
              )}
            </div>
          </div>
        </div>

        {/* 右侧歌词区域 */}
        <div className="flex-1 h-full flex flex-col py-8 z-10">
          <div 
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto scrollbar-hide px-8"
            onScroll={handleScroll}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-sm">加载歌词中...</p>
              </div>
            ) : lyricLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500 text-sm">暂无歌词</p>
                <p className="text-xs mt-2 text-gray-600">
                  可将 .lrc 歌词文件放在歌曲同目录下
                </p>
              </div>
            ) : (
              <div className="py-32 text-center">
                {lyricLines.map((line, index) => {
                  const isCurrent = index === lineIndex
                  const isPast = index < lineIndex
                  const distance = Math.abs(index - lineIndex)
                  
                  // 鼠标在歌词区域时不模糊
                  let opacity = 1
                  let shouldBlur = false
                  if (!isMouseOverLyrics && distance > 2) {
                    opacity = Math.max(0, 1 - (distance - 2) * 0.15)
                    shouldBlur = true
                  }
                  
                  return (
                    <div
                      key={`${line.time}-${index}`}
                      ref={isCurrent ? currentLineRef : null}
                      onClick={() => handleLineClick(line)}
                      className={`
                        py-4 px-4 rounded-lg cursor-pointer mb-2
                        transition-all duration-500 ease-in-out
                        ${isCurrent 
                          ? 'text-white text-3xl font-medium scale-110' 
                          : isPast
                            ? 'text-gray-600 text-2xl hover:text-gray-400'
                            : 'text-gray-500 text-2xl hover:text-gray-300 hover:bg-white/5'
                        }
                      `}
                      style={shouldBlur && opacity < 1 ? { opacity, filter: 'blur(0.5px)' } : undefined}
                    >
                      <span>{line.text}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
