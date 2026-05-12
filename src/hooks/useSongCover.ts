import { useState, useEffect, useRef } from 'react'
import { LRUCache } from 'lru-cache'
import api from '../api'
import { APP_CONFIG } from '../config'

const coverCache = new LRUCache<string, string>({
  max: APP_CONFIG.player.coverCacheSize,
  ttl: APP_CONFIG.player.coverCacheTTL,
})

const pendingRequests = new Map<string, Promise<string | null>>()

const PENDING_REQUEST_TTL = 30_000

function cleanupStalePendingRequests() {
  if (pendingRequests.size > 100) {
    pendingRequests.clear()
  }
}

export function useSongCover(path: string | undefined) {
  const [cover, setCover] = useState<string | null>(() => {
    if (!path) return null
    return coverCache.get(path) || null
  })
  const [isLoading, setIsLoading] = useState(false)
  const currentPathRef = useRef<string | undefined>(path)

  useEffect(() => {
    currentPathRef.current = path

    if (!path) {
      setCover(null)
      setIsLoading(false)
      return
    }

    const cachedCover = coverCache.get(path)
    if (cachedCover) {
      setCover(cachedCover)
      setIsLoading(false)
      return
    }

    setCover(null)
    setIsLoading(true)

    if (pendingRequests.has(path)) {
      pendingRequests.get(path)?.then((coverData) => {
        if (currentPathRef.current === path) {
          setCover(coverData)
          setIsLoading(false)
        }
      })
      return
    }

    cleanupStalePendingRequests()

    const timeoutId = setTimeout(() => {
      pendingRequests.delete(path)
    }, PENDING_REQUEST_TTL)

    const promise = api
      .getSongCoverFull(path)
      .then((coverData) => {
        if (coverData) {
          coverCache.set(path, coverData)
        }
        if (currentPathRef.current === path) {
          setCover(coverData)
        }
        return coverData
      })
      .catch((e) => {
        console.error('Failed to load song cover:', path, e)
        if (currentPathRef.current === path) {
          setCover(null)
        }
        return null
      })
      .finally(() => {
        clearTimeout(timeoutId)
        pendingRequests.delete(path)
        if (currentPathRef.current === path) {
          setIsLoading(false)
        }
      })

    pendingRequests.set(path, promise)
  }, [path])

  return { cover, isLoading }
}

export function useSongCovers(paths: string[]) {
  const [covers, setCovers] = useState<Map<string, string | null>>(() => {
    const initialCovers = new Map<string, string | null>()
    paths.forEach((path) => {
      const cached = coverCache.get(path)
      if (cached) {
        initialCovers.set(path, cached)
      }
    })
    return initialCovers
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (paths.length === 0) {
      setCovers(new Map())
      return
    }

    let cancelled = false

    const cachedCovers = new Map<string, string | null>()
    const uncachedPaths: string[] = []

    paths.forEach((path) => {
      const cached = coverCache.get(path)
      if (cached) {
        cachedCovers.set(path, cached)
      } else {
        uncachedPaths.push(path)
      }
    })

    if (uncachedPaths.length === 0) {
      setCovers(cachedCovers)
      return
    }

    setIsLoading(true)

    api
      .getSongCoversBatch(uncachedPaths)
      .then((batchResult) => {
        if (cancelled) return
        batchResult.forEach((cover, path) => {
          if (cover) {
            coverCache.set(path, cover)
          }
          cachedCovers.set(path, cover)
        })
        setCovers(new Map(cachedCovers))
        setIsLoading(false)
      })
      .catch((e) => {
        console.error('Failed to load song covers batch:', e)
        if (cancelled) return
        setCovers(new Map(cachedCovers))
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [paths])

  return { covers, isLoading }
}

export function clearCoverCache() {
  coverCache.clear()
}

export function getCoverCacheSize() {
  return coverCache.size
}
