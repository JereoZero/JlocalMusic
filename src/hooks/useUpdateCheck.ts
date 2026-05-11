import { useState, useCallback } from 'react'
import { APP_CONFIG } from '../config'

interface UpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkUpdate = useCallback(async () => {
    setIsChecking(true)
    setError(null)

    try {
      const response = await fetch(
        'https://api.github.com/repos/jz0ojiang/jlocalmusic/releases/latest',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`GitHub API 错误: ${response.status}`)
      }

      const data = await response.json()
      const latestVersion = data.tag_name?.replace(/^v/, '') || ''
      const currentVersion = APP_CONFIG.version

      const hasUpdate = isNewerVersion(latestVersion, currentVersion)

      setUpdateInfo({
        hasUpdate,
        latestVersion,
        currentVersion,
        releaseUrl: data.html_url || APP_CONFIG.releasesUrl,
        releaseNotes: data.body || '',
        publishedAt: data.published_at || '',
      })

      return hasUpdate
    } catch (err) {
      const message = err instanceof Error ? err.message : '检查更新失败'
      setError(message)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  const clearUpdateInfo = useCallback(() => {
    setUpdateInfo(null)
    setError(null)
  }, [])

  return {
    updateInfo,
    isChecking,
    error,
    checkUpdate,
    clearUpdateInfo,
  }
}

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const latestParts = parse(latest)
  const currentParts = parse(current)

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0
    const c = currentParts[i] || 0
    if (l > c) return true
    if (l < c) return false
  }

  return false
}
