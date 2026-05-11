import { useState, useEffect, useRef, useCallback } from 'react'
import { debounce } from 'es-toolkit'

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const d = debounce(setDebouncedValue, delay)
    d(value)
    return () => d.cancel()
  }, [value, delay])

  return debouncedValue
}

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const debouncedRef = useRef<ReturnType<typeof debounce<T>> | null>(null)

  useEffect(() => {
    const d = debounce(callback, delay)
    debouncedRef.current = d
    return () => d.cancel()
  }, [callback, delay])

  return useCallback((...args: Parameters<T>) => {
    debouncedRef.current?.(...args)
  }, []) as T
}

export { useSongCover, useSongCovers } from './useSongCover'
export { useSongSort, getSortIcon } from './useSongSort'
export type { TitleSortType, AlbumSortType, LikeSortType } from './useSongSort'
export { useMainBgColor } from './useMainBgColor'
export { useUpdateCheck } from './useUpdateCheck'
