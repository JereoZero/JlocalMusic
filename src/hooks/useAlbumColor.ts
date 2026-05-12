import { useState, useEffect } from 'react'
import { getColor } from 'colorthief'

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
    b: Math.round(b * 255),
  }
}

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

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function useAlbumColor(
  coverBase64: string | null,
  songPath?: string
): {
  lyrics: string | null
  playerBar: string | null
  main: string | null
  sidebar: string | null
} {
  const [dominantColor, setDominantColor] = useState<{
    lyrics: string | null
    playerBar: string | null
    main: string | null
    sidebar: string | null
  }>({ lyrics: null, playerBar: null, main: null, sidebar: null })

  useEffect(() => {
    if (!coverBase64 || !songPath) {
      setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
      return
    }

    const img = new Image()

    img.onload = async () => {
      try {
        const color = await getColor(img)
        if (!color) {
          setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
          return
        }
        const { r, g, b } = color.rgb()
        const hsl = rgbToHsl(r, g, b)

        const lyricsRgb = hslToRgb(hsl.h, hsl.s, 12)
        const mainRgb = hslToRgb(hsl.h, hsl.s, 10)
        const sidebarRgb = hslToRgb(hsl.h, hsl.s, 9)
        const playerBarRgb = hslToRgb(hsl.h, hsl.s, 7)

        setDominantColor({
          lyrics: rgbToHex(lyricsRgb.r, lyricsRgb.g, lyricsRgb.b),
          playerBar: rgbToHex(playerBarRgb.r, playerBarRgb.g, playerBarRgb.b),
          main: rgbToHex(mainRgb.r, mainRgb.g, mainRgb.b),
          sidebar: rgbToHex(sidebarRgb.r, sidebarRgb.g, sidebarRgb.b),
        })
      } catch (e) {
        console.error('Color extraction error:', e)
        setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
      }
    }

    img.onerror = () => {
      setDominantColor({ lyrics: null, playerBar: null, main: null, sidebar: null })
    }

    img.crossOrigin = 'anonymous'
    img.src = `data:image/jpeg;base64,${coverBase64}`

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [coverBase64, songPath])

  return dominantColor
}
