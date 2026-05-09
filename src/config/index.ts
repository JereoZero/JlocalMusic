export const APP_CONFIG = {
  version: '0.7.12',
  name: 'JlocalMusic',

  player: {
    defaultVolume: 0.8,
    progressUpdateInterval: 500,
    coverCacheSize: 500,
    coverCacheTTL: 1000 * 60 * 60,
  },

  toast: {
    duration: 4000,
  },

  theme: {
    primary: '#f97316',
    background: '#121212',
    surface: '#181818',
    surfaceLight: '#1a1a1a',
    border: '#2a2a2a',
    text: {
      primary: '#ffffff',
      secondary: '#9ca3af',
      muted: '#6b7280',
    },
  },

  scan: {
    minDurationSecs: 30,
  },
} as const
