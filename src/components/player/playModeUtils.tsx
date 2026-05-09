import { Shuffle, Repeat, List } from 'lucide-react'
import type { PlayMode } from '../../types'

export function getPlayModeIcon(mode: PlayMode) {
  switch (mode) {
    case 'loop':
      return (
        <div className="relative flex items-center justify-center">
          <Repeat size={18} />
          <span className="absolute text-[7px] font-bold">1</span>
        </div>
      )
    case 'shuffle':
      return <Shuffle size={18} />
    case 'list':
    default:
      return <List size={18} />
  }
}

export function getPlayModeTitle(mode: PlayMode) {
  switch (mode) {
    case 'loop':
      return '单曲循环'
    case 'shuffle':
      return '随机'
    case 'list':
    default:
      return '列表循环'
  }
}
