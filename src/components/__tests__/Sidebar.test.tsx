import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import Sidebar from '../Sidebar'
import type { ViewType } from '../../types'
import { APP_CONFIG } from '../../config'

describe('Sidebar', () => {
  const defaultProps = {
    currentView: 'local' as ViewType,
    onViewChange: vi.fn(),
    onToggleSettings: vi.fn(),
  }

  it('应该正确渲染 Logo', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Only')).toBeInTheDocument()
    expect(screen.getByText(APP_CONFIG.version)).toBeInTheDocument()
  })

  it('应该渲染所有导航按钮', () => {
    render(<Sidebar {...defaultProps} />)
    // Sidebar 现在只显示图标，通过 title 属性来识别按钮
    expect(screen.getByTitle('我喜欢')).toBeInTheDocument()
    expect(screen.getByTitle('播放历史')).toBeInTheDocument()
    expect(screen.getByTitle('本地音乐')).toBeInTheDocument()
    expect(screen.getByTitle('已隐藏')).toBeInTheDocument()
    expect(screen.getByTitle('设置')).toBeInTheDocument()
  })

  it('点击我喜欢应该调用 onViewChange', () => {
    render(<Sidebar {...defaultProps} />)
    fireEvent.click(screen.getByTitle('我喜欢'))
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('liked')
  })

  it('点击本地音乐应该调用 onViewChange', () => {
    render(<Sidebar {...defaultProps} />)
    fireEvent.click(screen.getByTitle('本地音乐'))
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('local')
  })

  it('点击设置应该调用 onToggleSettings', () => {
    render(<Sidebar {...defaultProps} />)
    fireEvent.click(screen.getByTitle('设置'))
    expect(defaultProps.onToggleSettings).toHaveBeenCalled()
  })

  it('当前选中的导航项应该有激活样式', () => {
    render(<Sidebar {...defaultProps} currentView="liked" />)
    const likedButton = screen.getByTitle('我喜欢')
    expect(likedButton).toHaveStyle({
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
    })
  })
})
