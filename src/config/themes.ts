export const THEMES = {
  orange: {
    id: 'orange',
    name: '橙色',
    primary: '#f97316',
  },
  khaki: {
    id: 'khaki',
    name: '卡其色',
    primary: '#c4a35a',
  },
  grayBlue: {
    id: 'grayBlue',
    name: '雾霾蓝',
    primary: '#6b8e9f',
  },
  oliveGreen: {
    id: 'oliveGreen',
    name: '橄榄绿',
    primary: '#6b8e6b',
  },
} as const

export type ThemeId = keyof typeof THEMES
export type Theme = (typeof THEMES)[ThemeId]

export const DEFAULT_THEME_ID: ThemeId = 'orange'

export function getTheme(id: ThemeId): Theme {
  return THEMES[id]
}

export function getThemePrimary(id: ThemeId): string {
  return THEMES[id].primary
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
