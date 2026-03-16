import { useState, useEffect, useRef } from 'react'
import { LRUCache } from 'lru-cache'
import api from '../api'

const coverCache = new LRUCache<string, string>({
  max: 500,
  ttl: 1000 * 60 * 60,
})

const pendingRequests = new Map<string, Promise<string | null>>()

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
      return
    }

    const cachedCover = coverCache.get(path)
    if (cachedCover) {
      setCover(cachedCover)
      return
    }

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

    const promise = api.getSongCoverFull(path)
      .then((coverData) => {
        if (coverData) {
          coverCache.set(path, coverData)
        }
        if (currentPathRef.current === path) {
          setCover(coverData)
        }
        return coverData
      })
      .catch(() => {
        if (currentPathRef.current === path) {
          setCover(null)
        }
        return null
      })
      .finally(() => {
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
    paths.forEach(path => {
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

    const cachedCovers = new Map<string, string | null>()
    const uncachedPaths: string[] = []
    
    paths.forEach(path => {
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
    
    Promise.all(
      uncachedPaths.map(path => 
        api.getSongCoverFull(path)
          .catch(() => null)
          .then(cover => {
            if (cover) {
              coverCache.set(path, cover)
            }
            return { path, cover }
          })
      )
    ).then(results => {
      results.forEach(({ path, cover }) => {
        cachedCovers.set(path, cover)
      })
      setCovers(new Map(cachedCovers))
      setIsLoading(false)
    })
  }, [paths])

  return { covers, isLoading }
}

export function clearCoverCache() {
  coverCache.clear()
}

export function getCoverCacheSize() {
  return coverCache.size
}
