import { useState, useEffect } from 'react'

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function useAlbumColor(coverBase64: string | null, songPath?: string): { lyrics: string | null; playerBar: string | null; main: string | null; sidebar: string | null } {
  const [dominantColor, setDominantColor] = useState<{ lyrics: string | null; playerBar: string | null; main: string | null; sidebar: string | null }>({ lyrics: null, playerBar: null, main: null, sidebar: null })

  useEffect(() => {
    if (!coverBase64 || !songPath) {
      setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
      return
    }

    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
          return
        }

        const size = 50
        canvas.width = size
        canvas.height = size
        
        ctx.drawImage(img, 0, 0, size, size)
        
        // 取右上角1/4区域的一个点
        const x = Math.floor(size * 3 / 4)
        const y = Math.floor(size / 4)
        const imageData = ctx.getImageData(x, y, 1, 1)
        const r = imageData.data[0]
        const g = imageData.data[1]
        const b = imageData.data[2]
        
        // 转换为 HSL，提取色相
        const hsl = rgbToHsl(r, g, b)
        
        // 歌词背景亮度 12%，主界面亮度 10%，侧边栏亮度 9%，底边栏亮度 7%
        const lyricsRgb = hslToRgb(hsl.h, hsl.s, 12)
        const mainRgb = hslToRgb(hsl.h, hsl.s, 10)
        const sidebarRgb = hslToRgb(hsl.h, hsl.s, 9)
        const playerBarRgb = hslToRgb(hsl.h, hsl.s, 7)
        const lyricsColor = rgbToHex(lyricsRgb.r, lyricsRgb.g, lyricsRgb.b)
        const playerBarColor = rgbToHex(playerBarRgb.r, playerBarRgb.g, playerBarRgb.b)
        const mainColor = rgbToHex(mainRgb.r, mainRgb.g, mainRgb.b)
        const sidebarColor = rgbToHex(sidebarRgb.r, sidebarRgb.g, sidebarRgb.b)
        
        console.log('Album colors - lyrics:', lyricsColor, 'playerBar:', playerBarColor, 'main:', mainColor, 'sidebar:', sidebarColor, 'HSL:', hsl)
        
        setDominantColor({ lyrics: lyricsColor, playerBar: playerBarColor, main: mainColor, sidebar: sidebarColor })
      } catch (e) {
        console.error('Color extraction error:', e)
        setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
      }
    }

    img.onerror = (e) => {
      console.error('Image load error:', e)
      setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
    }

    img.src = `data:image/jpeg;base64,${coverBase64}`

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [coverBase64, songPath])

  return dominantColor
}
