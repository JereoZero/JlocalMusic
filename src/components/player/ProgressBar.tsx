import { useRef, useState, useEffect, useCallback } from 'react'
import { formatDuration } from '../../utils/format'
import { useThemeStore } from '../../stores/themeStore'

interface ProgressBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

export default function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [displayTime, setDisplayTime] = useState(currentTime)
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const progress = duration > 0 ? (displayTime / duration) * 100 : 0

  useEffect(() => {
    if (!isDragging) {
      setDisplayTime(currentTime)
    }
  }, [currentTime, isDragging])

  const handleSeek = useCallback((newTime: number) => {
    if (duration <= 0) return
    const clampedTime = Math.max(0, Math.min(duration, newTime))
    setDisplayTime(clampedTime)
    onSeek(clampedTime)
  }, [duration, onSeek])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percentage * duration
    handleSeek(newTime)
  }, [duration, handleSeek])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return
    
    setIsDragging(true)
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percentage * duration
    setDisplayTime(newTime)
  }, [duration])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (duration <= 0) return
    const newTime = Math.max(0, Math.min(duration, displayTime + (e.deltaY > 0 ? -5 : 5)))
    handleSeek(newTime)
  }, [duration, displayTime, handleSeek])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (progressRef.current && duration > 0) {
        const rect = progressRef.current.getBoundingClientRect()
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const newTime = percentage * duration
        setDisplayTime(newTime)
      }
    }

    const handleMouseUp = () => {
      if (duration > 0) {
        handleSeek(displayTime)
      }
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, duration, displayTime, handleSeek])

  return (
    <div className="w-full flex items-center gap-2">
      <span className="text-xs text-gray-400 w-10 text-right select-none">
        {formatDuration(displayTime)}
      </span>
      <div
        ref={progressRef}
        className="flex-1 h-6 flex items-center cursor-pointer group py-2 -my-2"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div className="w-full h-1 bg-[#4a4a4a] rounded-full relative">
          <div
            className="h-full rounded-full relative transition-colors"
            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
          >
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-400 w-10 select-none">
        {formatDuration(duration)}
      </span>
    </div>
  )
}
