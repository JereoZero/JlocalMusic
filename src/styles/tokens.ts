// 设计 Token — 语义化命名，统一管理颜色和样式

export const colors = {
  // 背景层级 — 从深到浅
  bg: {
    base: '#0a0a0a',
    elevated: '#121212',
    surface: '#1a1a1a',
    hover: 'rgba(255,255,255,0.05)',
    active: 'rgba(255,255,255,0.1)',
    pressed: 'rgba(255,255,255,0.15)',
  },
  // 文字层级 — 从高对比到低对比
  text: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    disabled: '#52525b',
    inverse: '#000000',
  },
  // 边框
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.1)',
    focus: 'rgba(255,255,255,0.2)',
  },
  // 状态色
  status: {
    error: '#ef4444',
    errorBg: 'rgba(239,68,68,0.1)',
    success: '#22c55e',
    warning: '#f59e0b',
  },
} as const

// 间距系统 — 4px 基准
export const spacing = {
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const

// 圆角系统
export const radius = {
  none: '0',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const

// 过渡动画
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  default: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  color: '700ms cubic-bezier(0.33, 0, 0.67, 1)',
} as const

// 阴影
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 4px 12px rgba(0,0,0,0.4)',
  lg: '0 8px 24px rgba(0,0,0,0.5)',
  glow: (color: string) => `0 0 20px ${color}33`,
} as const

// 字体大小
export const fontSize = {
  xs: '12px',
  sm: '13px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '32px',
} as const

// 字体粗细
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const
