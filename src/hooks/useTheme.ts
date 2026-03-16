import { useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'
import { THEMES } from '../config/themes'

export function useTheme() {
  const { currentThemeId, setTheme, getPrimaryColor } = useThemeStore()
  
  useEffect(() => {
    // 更新 CSS 变量
    const root = document.documentElement
    root.style.setProperty('--primary-color', THEMES[currentThemeId].primary)
  }, [currentThemeId])
  
  return {
    currentThemeId,
    setTheme,
    primaryColor: getPrimaryColor(),
  }
}
