// 音频格式配置
export const AUDIO_FORMATS = {
  // 支持的普通音频格式
  normal: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'wma', 'ape', 'alac', 'dsd', 'dsf', 'dff'] as const,
  
  // 支持的加密音频格式
  encrypted: ['ncm', 'qmc', 'qmc0', 'qmc3', 'qmcflac', 'qmcogg', 'mflac'] as const,
  
  // 所有支持的格式
  all: [] as readonly string[],
} as const

// 运行时初始化 all 数组
const _allFormats = [...AUDIO_FORMATS.normal, ...AUDIO_FORMATS.encrypted]
Object.defineProperty(AUDIO_FORMATS, 'all', { value: _allFormats })

// 格式验证
export function isAudioFormat(ext: string): boolean {
  return AUDIO_FORMATS.all.includes(ext.toLowerCase())
}

export function isEncryptedFormat(ext: string): boolean {
  return AUDIO_FORMATS.encrypted.includes(ext.toLowerCase() as any)
}

export function isNormalFormat(ext: string): boolean {
  return AUDIO_FORMATS.normal.includes(ext.toLowerCase() as any)
}

// 播放器配置
export const PLAYER_CONFIG = {
  // 默认音量
  defaultVolume: 0.8,
  
  // 进度更新间隔 (ms)
  progressInterval: 250,
  
  // 封面缓存大小
  coverCacheSize: 500,
  
  // 封面缓存过期时间 (ms)
  coverCacheTTL: 1000 * 60 * 60, // 1小时
} as const

// 播放模式
export const PLAY_MODES = ['list', 'loop', 'shuffle'] as const
export type PlayMode = typeof PLAY_MODES[number]

// 队列来源
export const QUEUE_SOURCES = ['local', 'liked', 'history'] as const
export type QueueSource = typeof QUEUE_SOURCES[number]

// 视图类型
export const VIEW_TYPES = ['local', 'liked', 'hidden', 'history', 'settings'] as const
export type ViewType = typeof VIEW_TYPES[number]
