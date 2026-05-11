import { X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useThemeStore } from '../stores/themeStore'
import api from '../api'
import { useSongCover } from '../hooks/useSongCover'
import { useAlbumColor } from '../hooks/useAlbumColor'
import LyricParser from 'lrc-file-parser'
import { createErrorHandler } from '../utils/errorHandler'
import { cn } from '../utils/cn'
import { motion } from 'framer-motion'

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
  const suppressScrollRef = useRef(false)

  const { cover: coverBase64 } = useSongCover(currentSong?.path)
  const albumColors = useAlbumColor(coverBase64, currentSong?.path)
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  useEffect(() => {
    setIsPaused(!isPlaying)
  }, [isPlaying])

  const currentSongRef = useRef(currentSong)
  currentSongRef.current = currentSong

  useEffect(() => {
    const song = currentSongRef.current
    if (!song) {
      setLyricLines([])
      return
    }

    let cancelled = false

    setIsLoading(true)
    api
      .getLyrics(song.path)
      .then((source) => {
        if (cancelled) return
        if (source?.content) {
          if (lyricParserRef.current) {
            lyricParserRef.current.pause()
          }

          lyricParserRef.current = new LyricParser({
            onPlay: () => {},
            onSetLyric: (lines: LyricLine[]) => {
              if (!cancelled) setLyricLines(lines)
            },
            offset: 100,
            isRemoveBlankLine: true,
          })

          lyricParserRef.current.setLyric(source.content)
        } else {
          setLyricLines([])
        }
      })
      .catch(() => {
        if (!cancelled) setLyricLines([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      if (lyricParserRef.current) {
        lyricParserRef.current.pause()
      }
    }
  }, [currentSong?.path])

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

  const lastLyricSyncRef = useRef(0)

  useEffect(() => {
    if (lyricParserRef.current && lyricLines.length > 0) {
      const now = performance.now()
      if (now - lastLyricSyncRef.current < 200) return
      lastLyricSyncRef.current = now
      const timeMs = currentTime * 1000
      lyricParserRef.current.play(timeMs)
    }
  }, [currentTime, lyricLines])

  useEffect(() => {
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

      suppressScrollRef.current = true
      container.scrollTo({
        top: newScrollTop,
        behavior: 'smooth',
      })
      setTimeout(() => {
        suppressScrollRef.current = false
      }, 100)
    }
  }, [lineIndex, isUserScrolling])

  const handleLineClick = useCallback(
    (line: LyricLine) => {
      const time = line.time / 1000
      seek(time).catch(createErrorHandler('歌词跳转'))
    },
    [seek]
  )

  const handleCoverClick = useCallback(async () => {
    await togglePlay()
  }, [togglePlay])

  const handleScroll = useCallback(() => {
    if (suppressScrollRef.current) return

    setIsUserScrolling(true)

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false)
    }, 2000)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsMouseOverLyrics(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsMouseOverLyrics(false)
  }, [])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black/20 text-zinc-600">
        <p>暂无歌曲</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-sm"
        >
          返回
        </motion.button>
      </div>
    )
  }

  const title = currentSong.title || '未知歌曲'
  const artist = currentSong.artist || '未知歌手'
  const album = currentSong.album || '未知专辑'
  const bgColor = albumColors.lyrics || '#181818'

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* 动态背景层 */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          backgroundColor: bgColor,
          transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)',
        }}
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
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-9 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-30 text-zinc-500 hover:text-white"
        >
          <X size={24} />
        </motion.button>

        {/* 左侧专辑区域 */}
        <div className="w-[35%] h-full flex flex-col items-center justify-center px-8 z-10 ml-8">
          <div className="flex flex-col items-center gap-4">
            {/* 专辑封面 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl overflow-hidden bg-white/5 flex items-center justify-center cursor-pointer select-none shadow-2xl"
              style={{
                width: isPaused ? '200px' : '280px',
                height: isPaused ? '200px' : '280px',
                transition:
                  'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onClick={handleCoverClick}
              title={isPaused ? '点击播放' : '点击暂停'}
            >
              {coverBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${coverBase64}`}
                  alt={title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-20 h-20 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* 歌曲信息 */}
            <div className="text-center" style={{ width: '280px' }}>
              <h2 className="text-xl font-bold text-white mb-2 truncate">{title}</h2>
              <p className="text-sm text-zinc-500 mb-1 truncate">专辑：{album}</p>
              <p className="text-sm text-zinc-500 truncate">歌手：{artist}</p>
              {isPaused && (
                <div
                  className="mt-4 w-12 h-0.5 mx-auto rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
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
                <div className="flex items-center gap-2 text-zinc-600">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full"
                  />
                  <p className="text-sm">加载歌词中...</p>
                </div>
              </div>
            ) : lyricLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-zinc-600 text-sm">暂无歌词</p>
                <p className="text-xs mt-2 text-zinc-700">可将 .lrc 歌词文件放在歌曲同目录下</p>
              </div>
            ) : (
              <div className="py-32 text-center">
                {lyricLines.map((line, index) => {
                  const isCurrent = index === lineIndex
                  const isPast = index < lineIndex
                  const distance = Math.abs(index - lineIndex)

                  let opacity = 1
                  let shouldBlur = false
                  if (!isMouseOverLyrics && distance > 2) {
                    opacity = Math.max(0, 1 - (distance - 2) * 0.15)
                    shouldBlur = true
                  }

                  return (
                    <motion.div
                      key={`${line.time}-${index}`}
                      ref={isCurrent ? currentLineRef : null}
                      onClick={() => handleLineClick(line)}
                      className={cn(
                        'py-4 px-4 rounded-xl cursor-pointer mb-2',
                        'transition-all duration-500 ease-in-out',
                        isCurrent
                          ? 'text-white text-3xl font-medium scale-110'
                          : isPast
                            ? 'text-zinc-700 text-2xl hover:text-zinc-500'
                            : 'text-zinc-600 text-2xl hover:text-zinc-400 hover:bg-white/[0.03]'
                      )}
                      style={
                        shouldBlur && opacity < 1 ? { opacity, filter: 'blur(0.5px)' } : undefined
                      }
                    >
                      <span>{line.text}</span>
                    </motion.div>
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
