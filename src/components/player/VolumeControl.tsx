import { useRef, useState, useEffect, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'

interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
}

export default function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const volumeRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(volume)
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  const toggleMute = useCallback(() => {
    if (isMuted) {
      onVolumeChange(previousVolume)
      setIsMuted(false)
    } else {
      setPreviousVolume(volume)
      onVolumeChange(0)
      setIsMuted(true)
    }
  }, [isMuted, volume, previousVolume, onVolumeChange])

  const handleVolumeChange = useCallback((percentage: number) => {
    const newVolume = Math.max(0, Math.min(1, percentage))
    onVolumeChange(newVolume)
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }, [onVolumeChange])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return
    
    setIsDragging(true)
    const rect = volumeRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    handleVolumeChange(percentage)
  }, [handleVolumeChange])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const newVolume = Math.max(0, Math.min(1, volume + (e.deltaY > 0 ? -0.05 : 0.05)))
    onVolumeChange(newVolume)
  }, [volume, onVolumeChange])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (volumeRef.current) {
        const rect = volumeRef.current.getBoundingClientRect()
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        handleVolumeChange(percentage)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleVolumeChange])

  return (
    <div className="flex items-center gap-2">
      <div
        ref={volumeRef}
        className="w-24 h-6 flex items-center cursor-pointer group py-2 -my-2"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div className="w-full h-1 bg-[#4a4a4a] rounded-full relative">
          <div
            className="h-full rounded-full relative transition-colors"
            style={{ 
              width: `${(isMuted ? 0 : volume) * 100}%`,
              backgroundColor: primaryColor
            }}
          >
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        </div>
      </div>
      <button
        onClick={toggleMute}
        className="p-1 rounded-full transition-all duration-200 hover:bg-white/10"
        title={isMuted ? '取消静音' : '静音'}
      >
        {isMuted ? (
          <VolumeX size={18} className="text-gray-400" />
        ) : (
          <Volume2 size={18} className="text-gray-400" />
        )}
      </button>
    </div>
  )
}
