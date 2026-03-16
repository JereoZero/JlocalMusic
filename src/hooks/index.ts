import { useState, useEffect, useRef, useCallback } from 'react'

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; enabled?: boolean } = {}
) {
  const { ctrl = false, shift = false, alt = false, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlMatch = ctrl === e.ctrlKey
      const shiftMatch = shift === e.shiftKey
      const altMatch = alt === e.altKey
      const keyMatch = e.key.toLowerCase() === key.toLowerCase()

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault()
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, ctrl, shift, alt, enabled])
}

export { useSongCover, useSongCovers } from './useSongCover'
export { useSongSort, getSortIcon } from './useSongSort'
export type { TitleSortType, AlbumSortType, LikeSortType } from './useSongSort'
export { useMainBgColor } from './useMainBgColor'
