import { X, Folder, Trash2, Info, RefreshCw, FileText, Copy, AlertCircle, CheckCircle, Edit2, Plus, Minus, Palette } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from '../api/modules'
import { useLibraryStore } from '../stores/libraryStore'
import { useOperationLogStore } from '../stores/operationLogStore'
import { useThemeStore } from '../stores/themeStore'
import { THEMES, ThemeId } from '../config/themes'
import { useMainBgColor } from '../hooks'
import type { AppLog } from '../api/modules/types'
import { APP_CONFIG } from '../config'

interface SettingsViewProps {
  onClose: () => void
}

export default function SettingsView({ onClose }: SettingsViewProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'logs' | 'debug'>('general')
  const [logs, setLogs] = useState<AppLog[]>([])
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'error'>('all')
  const [musicFolder, setMusicFolder] = useState<string>('')
  const [secondaryFolders, setSecondaryFolders] = useState<string[]>([])
  const { fetchSongs, fetchHiddenPaths } = useLibraryStore()
  const { logs: operationLogs, clear: clearOperationLogs } = useOperationLogStore()
  const { currentThemeId, setTheme, getPrimaryColor } = useThemeStore()
  const bgColor = useMainBgColor()
  const primaryColor = getPrimaryColor()
  
  // 存储 timeout ID 以便清理
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  
  // 清理所有 timeout
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout)
    }
  }, [])

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 获取主文件夹（jmusic-file）
        const primaryFolder = await api.getPrimaryMusicFolder()
        setMusicFolder(primaryFolder)
        
        // 加载副文件夹列表
        const secondary = await api.getSecondaryFolders()
        setSecondaryFolders(secondary.map(s => s.target))
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const level = logFilter === 'all' ? undefined : logFilter.toUpperCase()
      const data = await api.getLogs(level, 100)
      setLogs(data)
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }, [logFilter])

  const handleCopyLogs = async () => {
    try {
      const text = await api.copyLogsToClipboard()
      await navigator.clipboard.writeText(text)
      showMessage('success', '日志已复制到剪贴板')
    } catch (error) {
      showMessage('error', '复制失败')
      console.error(error)
    }
  }

  const handleClearLogs = async () => {
    if (!confirm('确定要清空所有日志吗？')) return
    
    setLoading(true)
    try {
      const count = await api.clearLogs()
      showMessage('success', `已清空 ${count} 条日志`)
      await loadLogs()
    } catch (error) {
      showMessage('error', '清空失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getLogIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />
      case 'info':
      default:
        return <CheckCircle size={14} className="text-blue-400" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-400'
      case 'info':
      default:
        return 'text-blue-400'
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    const timeoutId = setTimeout(() => setMessage(null), 3000)
    timeoutRefs.current.push(timeoutId)
  }

  const handleClearPlayHistory = async () => {
    if (!confirm('确定要清空播放历史吗？')) return
    
    setLoading(true)
    try {
      await api.clearPlayHistory()
      showMessage('success', '已清空播放历史')
    } catch (error) {
      showMessage('error', '清空失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAllData = async () => {
    if (!confirm('⚠️ 警告：确定要清除全部历史数据吗？\n\n这将清空：\n- 播放历史\n- 喜欢列表\n- 隐藏列表\n- 操作日志\n\n然后重新扫描当前文件夹。\n\n此操作不可恢复！')) return
    
    setLoading(true)
    try {
      // 清空播放历史
      await api.clearPlayHistory()
      
      // 清空喜欢列表
      const likedPaths = await api.getLikedPaths()
      for (const path of likedPaths) {
        await api.toggleLike(path, false)
      }
      
      // 清空隐藏列表
      await api.clearHiddenSongs()
      
      // 清空操作日志
      clearOperationLogs()
      
      // 刷新数据
      await fetchHiddenPaths()
      await fetchSongs()
      
      // 重新扫描当前文件夹
      const result = await api.scanFolder(musicFolder)
      const totalCount = result.normal_songs.length + result.encrypted_songs.length
      showMessage('success', `已清除全部历史数据，重新扫描发现 ${totalCount} 首歌曲`)
      await fetchSongs()
    } catch (error) {
      showMessage('error', '清除失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearHiddenSongs = async () => {
    if (!confirm('确定要清空隐藏列表吗？')) return
    
    setLoading(true)
    try {
      const count = await api.clearHiddenSongs()
      showMessage('success', `已清空 ${count} 首隐藏歌曲`)
      await fetchHiddenPaths()
      await fetchSongs()
    } catch (error) {
      showMessage('error', '清空失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab, logFilter, loadLogs])

  const copyDebugLogs = () => {
    const logs = useOperationLogStore.getState().getAll()
    navigator.clipboard.writeText(logs.join('\n'))
    showMessage('success', '操作日志已复制')
  }

  const clearDebugLogs = () => {
    clearOperationLogs()
  }

  // 选择主文件夹
  const handleSelectPrimaryFolder = async () => {
    setLoading(true)
    try {
      const selected = await api.selectFolder()
      if (selected) {
        setMusicFolder(selected)
        await api.setSetting('music_folder', selected)
        
        // 自动扫描新文件夹
        const result = await api.scanFolder(selected)
        const totalCount = result.normal_songs.length + result.encrypted_songs.length
        showMessage('success', `主文件夹已更新，发现 ${totalCount} 首歌曲`)
        await fetchSongs()
      }
    } catch (error) {
      showMessage('error', '选择文件夹失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 添加副文件夹
  const handleAddSecondaryFolder = async () => {
    setLoading(true)
    try {
      const selected = await api.selectFolder()
      if (selected) {
        // 在主文件夹内创建符号链接
        await api.addSecondaryFolder(selected)
        setSecondaryFolders(prev => [...prev, selected])
        showMessage('success', `已添加副文件夹`)
        
        // 重新扫描主文件夹（会自动遍历符号链接）
        const result = await api.scanFolder(musicFolder)
        const totalCount = result.normal_songs.length + result.encrypted_songs.length
        showMessage('success', `扫描完成！发现 ${totalCount} 首歌曲`)
        await fetchSongs()
      }
    } catch (error) {
      showMessage('error', '选择文件夹失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 删除副文件夹
  const handleRemoveSecondaryFolder = async (index: number) => {
    if (!confirm('确定要删除这个副文件夹吗？\n\n注意：歌曲会从列表中移除，但不会删除文件。')) return
    
    setLoading(true)
    try {
      // 获取副文件夹列表，找到对应的链接名称
      const secondary = await api.getSecondaryFolders()
      const folderToRemove = secondaryFolders[index]
      const linkInfo = secondary.find(s => s.target === folderToRemove)
      
      if (linkInfo) {
        // 删除符号链接
        await api.removeSecondaryFolder(linkInfo.name)
        setSecondaryFolders(prev => prev.filter((_, i) => i !== index))
        showMessage('success', '已删除副文件夹，请刷新歌曲列表')
      } else {
        showMessage('error', '找不到对应的链接')
      }
    } catch (error) {
      showMessage('error', '删除失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 重新扫描文件夹
  const handleRescan = async () => {
    setLoading(true)
    try {
      const result = await api.scanFolder(musicFolder)
      const totalCount = result.normal_songs.length + result.encrypted_songs.length
      showMessage('success', `扫描完成！发现 ${totalCount} 首歌曲`)
      await fetchSongs()
    } catch (error) {
      showMessage('error', '扫描失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col transition-colors duration-700 select-none" style={{ backgroundColor: bgColor, transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)' }}>
      {/* 头部 */}
      <div className="px-6 py-4 mt-8 flex items-center justify-between border-b border-[#2a2a2a]">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">设置</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
              style={activeTab === 'general' ? { backgroundColor: primaryColor } : undefined}
            >
              通用
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'logs'
                  ? 'text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
              style={activeTab === 'logs' ? { backgroundColor: primaryColor } : undefined}
            >
              日志
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'debug'
                  ? 'text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
              style={activeTab === 'debug' ? { backgroundColor: primaryColor } : undefined}
            >
              调试
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* 设置内容 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}
        <div className="max-w-2xl space-y-6">
          {activeTab === 'general' ? (
            <>
              {/* 音乐文件夹设置 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Folder size={20} className="text-orange-500" />
                  音乐文件夹
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{musicFolder || '未设置'}</p>
                      <p className="text-xs text-gray-400">主音乐文件夹</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-500 rounded mr-2">
                      当前使用
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSelectPrimaryFolder}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors text-sm text-white"
                  >
                    <Edit2 size={14} />
                    更改主文件夹
                  </button>
                  <button
                    onClick={handleRescan}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm text-white disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    重新扫描
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  主文件夹是主要的音乐来源，应用启动时会自动扫描。
                </p>
              </section>

              {/* 主题设置 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Palette size={20} style={{ color: THEMES[currentThemeId].primary }} />
                  主题色
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                    const theme = THEMES[id]
                    const isSelected = currentThemeId === id
                    return (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-white bg-white/10' 
                            : 'border-transparent bg-white/10 hover:bg-white/15'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full mx-auto mb-2"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <p className={`text-xs text-center ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {theme.name}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  选择喜欢的主题色，会影响界面中的强调色。
                </p>
              </section>

              {/* 副文件夹 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Folder size={20} className="text-blue-500" />
                  副文件夹
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  添加额外的音乐文件夹，歌曲会合并到本地音乐中
                </p>
                
                <div className="space-y-3">
                  {secondaryFolders.map((folder, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{folder}</p>
                        <p className="text-xs text-gray-400">副文件夹 {index + 1}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveSecondaryFolder(index)}
                        disabled={loading}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        title="删除此文件夹"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={handleAddSecondaryFolder}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm text-gray-400 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    添加副文件夹
                  </button>
                </div>
              </section>

              {/* 数据管理 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trash2 size={20} className="text-red-500" />
                  数据管理
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                    <div>
                      <p className="text-sm text-white">播放历史</p>
                      <p className="text-xs text-gray-400">清空所有播放记录</p>
                    </div>
                    <button
                      onClick={handleClearPlayHistory}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                    <div>
                      <p className="text-sm text-white">隐藏列表</p>
                      <p className="text-xs text-gray-400">恢复所有隐藏的歌曲</p>
                    </div>
                    <button
                      onClick={handleClearHiddenSongs}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                    >
                      清空
                    </button>
                  </div>
                </div>
              </section>

              {/* 关于 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Info size={20} className="text-blue-500" />
                  关于
                </h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>
                    <span className="text-gray-500">应用名称：</span>
                    <span className="text-white">JlocalMusic</span>
                  </p>
                  <p>
                    <span className="text-gray-500">版本：</span>
                    <span className="text-white">v{APP_CONFIG.version}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">技术栈：</span>
                    <span className="text-white">Rust + Tauri 2 + React 19</span>
                  </p>
                  <p className="pt-2">
                    本地音乐播放器，支持 MP3、FLAC、WAV 等格式。
                  </p>
                </div>
              </section>

              {/* 版本历史 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-green-500" />
                  版本历史
                </h3>
                <div className="space-y-4 text-sm max-h-80 overflow-y-auto">
                  {/* v0.7.6 */}
                  <div className="border-l-2 border-orange-500 pl-4">
                    <p className="text-white font-medium">v0.7.6</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-15</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>DSF/DFF/DSD 格式支持：使用 Symphonia 解码器播放和获取时长</li>
                      <li>扫描优化：自动清理已删除的歌曲</li>
                      <li>主文件夹/副文件夹管理修复</li>
                      <li>颜色过渡时间调整为 0.7 秒</li>
                      <li>修复数据库只读问题</li>
                    </ul>
                  </div>
                  {/* v0.7.5 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.7.5</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-14</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>专辑色动态背景：根据当前播放歌曲的专辑封面提取主色调</li>
                      <li>背景亮度分层：歌词背景 12%、主界面 10%、侧边栏 9%、底边栏 7%</li>
                      <li>主题色系统：支持橙色、卡其色、雾霾蓝、橄榄绿四种主题</li>
                      <li>颜色过渡动画：丝滑过渡效果</li>
                      <li>UI 细节优化：灰色背景改为透明度、专辑图禁止拖动、进度条触发范围增大</li>
                      <li>Logo 简化：移除图片，Only 文字作为新 logo</li>
                      <li>全局禁止文字选择，提升操作体验</li>
                    </ul>
                  </div>
                  {/* v0.7.4 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.7.4</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-13</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>歌词界面优化：专辑封面点击暂停/播放</li>
                      <li>暂停时显示横线指示器</li>
                      <li>歌词滚动交互改进：用户滚动后 2 秒恢复自动滚动</li>
                      <li>鼠标悬停歌词区域时取消模糊效果</li>
                    </ul>
                  </div>
                  {/* v0.7.3 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.7.3</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-13</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>歌词显示优化：边缘歌词透明渐变</li>
                      <li>专辑封面动画：弹性缩放效果</li>
                      <li>歌词背景亮度调整为 12%</li>
                    </ul>
                  </div>
                  {/* v0.6.6 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.6.6</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-12</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>修复歌曲列表布局对齐问题</li>
                      <li>修复 Toast 提示位置遮挡播放栏</li>
                      <li>优化缩略图尺寸 (56px/200px)</li>
                      <li>修复切歌时旧歌曲未停止的问题</li>
                      <li>点击导航栏自动退出歌词界面</li>
                      <li>添加设置页面调试功能</li>
                    </ul>
                  </div>
                  {/* v0.6.5 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.6.5</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-12</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>新增歌词显示功能</li>
                      <li>支持 LRC 歌词文件解析</li>
                      <li>支持内嵌歌词提取</li>
                      <li>歌词同步滚动和高亮</li>
                    </ul>
                  </div>
                  {/* v0.6.4 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.6.4</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-11</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>新增歌词界面</li>
                      <li>优化隐藏/喜欢逻辑</li>
                      <li>改进侧边栏和播放栏 UI</li>
                      <li>添加 Logo 和主题色标识</li>
                    </ul>
                  </div>
                  {/* v0.6.1 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.6.1</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-11</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>新增播放历史视图</li>
                      <li>支持滚轮控制音量和播放进度</li>
                      <li>优化表格对齐和布局</li>
                      <li>更新 Logo 样式</li>
                    </ul>
                  </div>
                  {/* v0.6.0 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.6.0</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-10</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>全新界面设计</li>
                      <li>支持歌曲喜欢/隐藏功能</li>
                      <li>支持多种排序方式</li>
                      <li>新增日志管理功能</li>
                    </ul>
                  </div>
                  {/* v0.5.0 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.5.0</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-08</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>重构播放器核心</li>
                      <li>添加播放列表功能</li>
                      <li>支持循环播放模式</li>
                      <li>优化音频解码性能</li>
                    </ul>
                  </div>
                  {/* v0.4.0 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.4.0</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-05</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>添加音乐库管理</li>
                      <li>支持文件夹扫描</li>
                      <li>添加歌曲搜索功能</li>
                      <li>支持封面图片显示</li>
                    </ul>
                  </div>
                  {/* v0.3.0 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.3.0</p>
                    <p className="text-xs text-gray-500 mb-2">2025-02-02</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>添加数据库支持 (SQLite)</li>
                      <li>支持播放历史记录</li>
                      <li>添加歌曲元数据读取</li>
                      <li>支持多种音频格式</li>
                    </ul>
                  </div>
                  {/* v0.2.0 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.2.0</p>
                    <p className="text-xs text-gray-500 mb-2">2025-01-28</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>基础播放器功能</li>
                      <li>支持播放/暂停/上一首/下一首</li>
                      <li>添加进度条和音量控制</li>
                      <li>支持 MP3 格式播放</li>
                    </ul>
                  </div>
                  {/* v0.1.0 */}
                  <div className="border-l-2 border-gray-600 pl-4">
                    <p className="text-white font-medium">v0.1.0</p>
                    <p className="text-xs text-gray-500 mb-2">2025-01-25</p>
                    <ul className="text-gray-400 space-y-1 list-disc list-inside">
                      <li>项目初始化</li>
                      <li>搭建 Tauri + React 框架</li>
                      <li>基础界面布局</li>
                      <li>添加文件选择功能</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          ) : activeTab === 'logs' ? (
            <>
              {/* 日志管理 */}
              <section className="bg-white/5 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText size={20} className="text-blue-500" />
                    日志管理
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLogs}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/15 transition-colors text-sm text-white"
                    >
                      <Copy size={14} />
                      复制
                    </button>
                    <button
                      onClick={() => loadLogs()}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/15 transition-colors text-sm text-white"
                    >
                      <RefreshCw size={14} />
                      刷新
                    </button>
                    <button
                      onClick={handleClearLogs}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      清空
                    </button>
                  </div>
                </div>

                {/* 日志过滤 */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      logFilter === 'all'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setLogFilter('info')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      logFilter === 'info'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    信息
                  </button>
                  <button
                    onClick={() => setLogFilter('error')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      logFilter === 'error'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    错误
                  </button>
                </div>

                {/* 日志列表 */}
                <div className="bg-[#121212] rounded-lg p-4 max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无日志
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                        >
                          <div className="mt-0.5">{getLogIcon(log.level)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${getLogColor(log.level)}`}>
                                {log.level}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 break-words">
                              {log.message}
                            </p>
                            {log.target && (
                              <p className="text-xs text-gray-500 mt-1">
                                目标: {log.target}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : activeTab === 'debug' ? (
            <>
              {/* 清除全部数据 */}
              <section className="bg-white/5 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trash2 size={20} className="text-red-500" />
                  数据清除
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  清除所有历史数据，包括播放历史、喜欢列表、隐藏列表等
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                    <div>
                      <p className="text-sm text-white">清除全部历史数据</p>
                      <p className="text-xs text-gray-400">清空播放历史、喜欢列表、隐藏列表、操作日志</p>
                    </div>
                    <button
                      onClick={handleClearAllData}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      清除全部
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                    <div>
                      <p className="text-sm text-white">仅清除播放历史</p>
                      <p className="text-xs text-gray-400">保留喜欢列表和隐藏列表</p>
                    </div>
                    <button
                      onClick={handleClearPlayHistory}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      清除
                    </button>
                  </div>
                </div>
              </section>

              {/* 操作日志 */}
              <section className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle size={20} className="text-yellow-500" />
                  操作日志
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  记录用户操作和后台执行情况，便于排查问题
                </p>
                
                <div className="bg-[#121212] rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">日志记录</span>
                    <div className="flex gap-2">
                      <button
                        onClick={copyDebugLogs}
                        className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/15 text-gray-400"
                      >
                        复制
                      </button>
                      <button
                        onClick={clearDebugLogs}
                        className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/15 text-gray-400"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  {operationLogs.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      暂无操作记录
                    </div>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {operationLogs.map((log, index) => (
                        <div key={index} className="text-gray-300">
                          [{log.timestamp}] {log.action}{log.detail ? ` - ${log.detail}` : ''}{log.error ? ` [错误: ${log.error}]` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
