import {
  X,
  Folder,
  Trash2,
  Info,
  RefreshCw,
  FileText,
  Copy,
  AlertCircle,
  CheckCircle,
  Edit2,
  Plus,
  Minus,
  Palette,
  Github,
  ExternalLink,
  Download,
  Sparkles,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import * as api from '../api/modules'
import { useLibraryStore } from '../stores/libraryStore'
import { useOperationLogStore } from '../stores/operationLogStore'
import { useThemeStore } from '../stores/themeStore'
import { THEMES, ThemeId } from '../config/themes'
import { useMainBgColor, useUpdateCheck } from '../hooks'
import type { AppLog } from '../api/modules/types'
import { handleError } from '../utils/errorHandler'
import { APP_CONFIG } from '../config'
import { hexToRgba } from '../config/themes'
import { toast } from 'sonner'
import { cn } from '../utils/cn'
import { SettingCard, SettingRow, TabButton } from '../components/settings'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsViewProps {
  onClose: () => void
}

export default function SettingsView({ onClose }: SettingsViewProps) {
  const [loading, setLoading] = useState(false)
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
  const { updateInfo, isChecking, error: updateError, checkUpdate, clearUpdateInfo } = useUpdateCheck()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const primaryFolder = await api.getPrimaryMusicFolder()
        setMusicFolder(primaryFolder)
        const secondary = await api.getSecondaryFolders()
        setSecondaryFolders(secondary.map((s) => s.target))
      } catch (error) {
        handleError(error, '加载设置')
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
      handleError(error, '加载日志')
    }
  }, [logFilter])

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab, logFilter, loadLogs])

  const handleCopyLogs = async () => {
    try {
      const text = await api.copyLogsToClipboard()
      await navigator.clipboard.writeText(text)
      toast.success('日志已复制到剪贴板')
    } catch (error) {
      toast.error('复制失败')
      handleError(error, '复制日志')
    }
  }

  const handleClearLogs = async () => {
    if (!confirm('确定要清空所有日志吗？')) return
    setLoading(true)
    try {
      const count = await api.clearLogs()
      toast.success(`已清空 ${count} 条日志`)
      await loadLogs()
    } catch (error) {
      toast.error('清空失败')
      handleError(error, '清空日志')
    } finally {
      setLoading(false)
    }
  }

  const getLogIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />
      default:
        return <CheckCircle size={14} className="text-blue-400" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-400'
      default:
        return 'text-blue-400'
    }
  }

  const handleClearPlayHistory = async () => {
    if (!confirm('确定要清空播放历史吗？')) return
    setLoading(true)
    try {
      await api.clearPlayHistory()
      toast.success('已清空播放历史')
    } catch (error) {
      toast.error('清空失败')
      handleError(error, '清空历史')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAllData = async () => {
    if (!confirm('⚠️ 警告：确定要清除全部历史数据吗？\n\n这将清空播放历史、喜欢列表、隐藏列表、操作日志。此操作不可恢复！')) return
    setLoading(true)
    try {
      await api.clearPlayHistory()
      await api.clearLikedSongs()
      await api.clearHiddenSongs()
      clearOperationLogs()
      await fetchHiddenPaths()
      await fetchSongs()
      const result = await api.scanFolder(musicFolder)
      const totalCount = result.normal_songs.length + result.encrypted_songs.length
      toast.success(`已清除全部历史数据，重新扫描发现 ${totalCount} 首歌曲`)
      await fetchSongs()
    } catch (error) {
      toast.error('清除失败')
      handleError(error, '清除全部数据')
    } finally {
      setLoading(false)
    }
  }

  const handleClearHiddenSongs = async () => {
    if (!confirm('确定要清空隐藏列表吗？')) return
    setLoading(true)
    try {
      const count = await api.clearHiddenSongs()
      toast.success(`已清空 ${count} 首隐藏歌曲`)
      await fetchHiddenPaths()
      await fetchSongs()
    } catch (error) {
      toast.error('清空失败')
      handleError(error, '清空隐藏列表')
    } finally {
      setLoading(false)
    }
  }

  const copyDebugLogs = () => {
    const logs = useOperationLogStore.getState().getAll()
    navigator.clipboard
      .writeText(logs.join('\n'))
      .then(() => toast.success('操作日志已复制'))
      .catch((e) => {
        toast.error('复制失败')
        handleError(e, '复制操作日志')
      })
  }

  const clearDebugLogs = () => {
    clearOperationLogs()
  }

  const handleSelectPrimaryFolder = async () => {
    setLoading(true)
    try {
      const selected = await api.selectFolder()
      if (selected) {
        setMusicFolder(selected)
        await api.setSetting('music_folder', selected)
        const result = await api.scanFolder(selected)
        const totalCount = result.normal_songs.length + result.encrypted_songs.length
        toast.success(`主文件夹已更新，发现 ${totalCount} 首歌曲`)
        await fetchSongs()
      }
    } catch (error) {
      toast.error('选择文件夹失败')
      handleError(error, '选择主文件夹')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSecondaryFolder = async () => {
    setLoading(true)
    try {
      const selected = await api.selectFolder()
      if (selected) {
        await api.addSecondaryFolder(selected)
        setSecondaryFolders((prev) => [...prev, selected])
        toast.success('已添加副文件夹')
        const result = await api.scanFolder(musicFolder)
        const totalCount = result.normal_songs.length + result.encrypted_songs.length
        toast.success(`扫描完成！发现 ${totalCount} 首歌曲`)
        await fetchSongs()
      }
    } catch (error) {
      toast.error('选择文件夹失败')
      handleError(error, '选择二级文件夹')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSecondaryFolder = async (index: number) => {
    if (!confirm('确定要删除这个副文件夹吗？\n注意：歌曲会从列表中移除，但不会删除文件。')) return
    setLoading(true)
    try {
      const secondary = await api.getSecondaryFolders()
      const folderToRemove = secondaryFolders[index]
      const linkInfo = secondary.find((s) => s.target === folderToRemove)
      if (linkInfo) {
        await api.removeSecondaryFolder(linkInfo.name)
        setSecondaryFolders((prev) => prev.filter((_, i) => i !== index))
        const result = await api.scanFolder(musicFolder)
        const totalCount = result.normal_songs.length + result.encrypted_songs.length
        toast.success(`已删除副文件夹，扫描完成！发现 ${totalCount} 首歌曲`)
        await fetchSongs()
      }
    } catch (error) {
      toast.error('删除失败')
      handleError(error, '删除副文件夹')
    } finally {
      setLoading(false)
    }
  }

  const handleRescan = async () => {
    setLoading(true)
    try {
      const result = await api.scanFolder(musicFolder)
      const totalCount = result.normal_songs.length + result.encrypted_songs.length
      toast.success(`扫描完成！发现 ${totalCount} 首歌曲`)
      await fetchSongs()
    } catch (error) {
      toast.error('扫描失败')
      handleError(error, '重新扫描')
    } finally {
      setLoading(false)
    }
  }

  const sectionTitleClass = 'text-lg font-semibold text-white mb-4 flex items-center gap-2'
  const buttonPrimaryClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white',
    'transition-all duration-200 hover:brightness-110 active:scale-95'
  )
  const buttonSecondaryClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
    'bg-white/5 text-white hover:bg-white/10 transition-all duration-200 active:scale-95'
  )
  const buttonDangerClass = cn(
    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
    'bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95'
  )

  return (
    <div
      className="h-full flex flex-col transition-colors duration-700 select-none"
      style={{
        backgroundColor: bgColor,
        transitionTimingFunction: 'cubic-bezier(0.33, 0, 0.67, 1)',
      }}
    >
      {/* 头部 */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">设置</h2>
          <div className="flex gap-2">
            <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} primaryColor={primaryColor}>
              通用
            </TabButton>
            <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} primaryColor={primaryColor}>
              日志
            </TabButton>
            <TabButton active={activeTab === 'debug'} onClick={() => setActiveTab('debug')} primaryColor={primaryColor}>
              调试
            </TabButton>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={20} />
        </motion.button>
      </div>

      {/* 设置内容 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 音乐文件夹 */}
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <Folder size={20} style={{ color: primaryColor }} />
                      音乐文件夹
                    </h3>
                    <div className="space-y-3">
                      <SettingRow title={musicFolder || '未设置'} description="主音乐文件夹">
                        <span
                          className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{
                            backgroundColor: hexToRgba(primaryColor, 0.15),
                            color: primaryColor,
                          }}
                        >
                          当前使用
                        </span>
                      </SettingRow>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={handleSelectPrimaryFolder} className={buttonPrimaryClass} style={{ backgroundColor: primaryColor }}>
                        <Edit2 size={14} />
                        更改主文件夹
                      </button>
                      <button onClick={handleRescan} disabled={loading} className={buttonSecondaryClass}>
                        <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                        重新扫描
                      </button>
                    </div>
                  </div>
                </SettingCard>

                {/* 主题色 */}
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <Palette size={20} style={{ color: THEMES[currentThemeId].primary }} />
                      主题色
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                        const theme = THEMES[id]
                        const isSelected = currentThemeId === id
                        return (
                          <motion.button
                            key={id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setTheme(id)}
                            className={cn(
                              'p-3 rounded-xl border-2 transition-all duration-200',
                              isSelected
                                ? 'border-white/20 bg-white/5'
                                : 'border-transparent bg-white/[0.03] hover:bg-white/5'
                            )}
                          >
                            <div
                              className="w-8 h-8 rounded-full mx-auto mb-2 ring-2 ring-white/10"
                              style={{ backgroundColor: theme.primary }}
                            />
                            <p className={cn('text-xs text-center', isSelected ? 'text-white font-medium' : 'text-zinc-500')}>
                              {theme.name}
                            </p>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                </SettingCard>

                {/* 副文件夹 */}
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <Folder size={20} className="text-blue-400" />
                      副文件夹
                    </h3>
                    <p className="text-xs text-zinc-600 mb-4">添加额外的音乐文件夹，歌曲会合并到本地音乐中</p>
                    <div className="space-y-3">
                      {secondaryFolders.map((folder, index) => (
                        <SettingRow key={index} title={folder} description={`副文件夹 ${index + 1}`}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRemoveSecondaryFolder(index)}
                            disabled={loading}
                            className={cn(buttonDangerClass, 'p-2')}
                          >
                            <Minus size={16} />
                          </motion.button>
                        </SettingRow>
                      ))}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleAddSecondaryFolder}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.03] hover:bg-white/5 rounded-lg transition-colors text-sm text-zinc-500 border border-white/5 border-dashed"
                      >
                        <Plus size={16} />
                        添加副文件夹
                      </motion.button>
                    </div>
                  </div>
                </SettingCard>

                {/* 数据管理 */}
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <Trash2 size={20} className="text-red-400" />
                      数据管理
                    </h3>
                    <div className="space-y-3">
                      <SettingRow title="播放历史" description="清空所有播放记录">
                        <button onClick={handleClearPlayHistory} disabled={loading} className={buttonDangerClass}>
                          清空
                        </button>
                      </SettingRow>
                      <SettingRow title="隐藏列表" description="恢复所有隐藏的歌曲">
                        <button onClick={handleClearHiddenSongs} disabled={loading} className={buttonDangerClass}>
                          清空
                        </button>
                      </SettingRow>
                    </div>
                  </div>
                </SettingCard>

                {/* 关于 */}
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <Info size={20} className="text-blue-400" />
                      关于
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-2">
                        <span className="text-zinc-600 w-20">应用名称</span>
                        <span className="text-white font-medium">JlocalMusic</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-zinc-600 w-20">版本</span>
                        <span className="text-white">v{APP_CONFIG.version}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-zinc-600 w-20">技术栈</span>
                        <span className="text-white">Rust + Tauri 2 + React 19</span>
                      </div>

                      {/* 项目地址 */}
                      <div className="pt-2">
                        <a
                          href={APP_CONFIG.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all text-sm"
                        >
                          <Github size={16} />
                          <span>GitHub 项目主页</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* 检查更新 */}
                      <div className="pt-1">
                        {!updateInfo ? (
                          <button
                            onClick={checkUpdate}
                            disabled={isChecking}
                            className={cn(
                              'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                              'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                            )}
                          >
                            <RefreshCw size={16} className={cn(isChecking && 'animate-spin')} />
                            {isChecking ? '检查中...' : '检查更新'}
                          </button>
                        ) : updateInfo.hasUpdate ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Sparkles size={16} className="text-yellow-400" />
                              <span className="text-white">
                                发现新版本 v{updateInfo.latestVersion}
                              </span>
                              <span className="text-zinc-600">
                                (当前 v{updateInfo.currentVersion})
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <a
                                href={updateInfo.releaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white',
                                  'transition-all duration-200 hover:brightness-110 active:scale-95'
                                )}
                                style={{ backgroundColor: primaryColor }}
                              >
                                <Download size={16} />
                                前往下载
                              </a>
                              <button
                                onClick={clearUpdateInfo}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/10 transition-all"
                              >
                                忽略
                              </button>
                            </div>
                            {updateInfo.publishedAt && (
                              <p className="text-xs text-zinc-600">
                                发布于 {new Date(updateInfo.publishedAt).toLocaleDateString('zh-CN')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <CheckCircle size={16} className="text-green-400" />
                            <span>已是最新版本 v{updateInfo.currentVersion}</span>
                            <button
                              onClick={clearUpdateInfo}
                              className="text-xs text-zinc-600 hover:text-zinc-400 ml-2"
                            >
                              重新检查
                            </button>
                          </div>
                        )}
                        {updateError && (
                          <p className="text-xs text-red-400 mt-1">{updateError}</p>
                        )}
                      </div>

                      <p className="text-zinc-600 pt-2">本地音乐播放器，支持 MP3、FLAC、WAV 等格式。</p>
                    </div>
                  </div>
                </SettingCard>

                {/* 版本历史 */}
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <FileText size={20} className="text-green-400" />
                      版本历史
                    </h3>
                    <div className="space-y-4 text-sm max-h-80 overflow-y-auto">
                      <div className="border-l-2 pl-4" style={{ borderLeftColor: primaryColor }}>
                        <p className="text-white font-medium">v0.8.3</p>
                        <p className="text-xs text-zinc-600 mb-2">2026-05-11</p>
                        <ul className="space-y-1 text-zinc-500">
                          <li>首次播放无声修复：前端 togglePlay 区分 backendLoaded</li>
                          <li>窗口拖拽修复：切换为原生 macOS 标题栏</li>
                          <li>macOS 原生标题栏深色：NSAppearanceNameDarkAqua 强制深色</li>
                          <li>清理：删除所有失效的自定义拖拽代码</li>
                        </ul>
                      </div>
                      <div className="border-l-2 border-zinc-800 pl-3">
                        <span className="text-zinc-500 text-xs">v0.8.2</span>
                        <span className="text-zinc-700 text-xs ml-2">— SineWave 预热音频管线，窗口拖拽三重保障</span>
                      </div>
                      <div className="border-l-2 border-zinc-800 pl-3">
                        <span className="text-zinc-500 text-xs">v0.8.1</span>
                        <span className="text-zinc-700 text-xs ml-2">— macOS Overlay 暗色标题栏，后端防卡死</span>
                      </div>
                      <div className="border-l-2 border-zinc-800 pl-3">
                        <span className="text-zinc-500 text-xs">v0.8.0</span>
                        <span className="text-zinc-700 text-xs ml-2">— 新 Logo + 霓虹绿主题，Fisher-Yates 随机播放</span>
                      </div>
                    </div>
                  </div>
                </SettingCard>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <SettingCard>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={sectionTitleClass}>
                        <FileText size={20} className="text-blue-400" />
                        日志管理
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={handleCopyLogs} className={buttonSecondaryClass}>
                          <Copy size={14} />
                          复制
                        </button>
                        <button onClick={() => loadLogs()} className={buttonSecondaryClass}>
                          <RefreshCw size={14} />
                          刷新
                        </button>
                        <button onClick={handleClearLogs} disabled={loading} className={buttonDangerClass}>
                          <Trash2 size={14} />
                          清空
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {(['all', 'info', 'error'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setLogFilter(filter)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                            logFilter === filter
                              ? 'text-white'
                              : 'bg-white/5 text-zinc-500 hover:text-zinc-300'
                          )}
                          style={logFilter === filter ? { backgroundColor: primaryColor } : undefined}
                        >
                          {filter === 'all' ? '全部' : filter === 'info' ? '信息' : '错误'}
                        </button>
                      ))}
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 max-h-96 overflow-y-auto border border-white/5">
                      {logs.length === 0 ? (
                        <div className="text-center py-8 text-zinc-600">暂无日志</div>
                      ) : (
                        <div className="space-y-2">
                          {logs.map((log) => (
                            <div key={log.id} className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/5">
                              <div className="mt-0.5">{getLogIcon(log.level)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn('text-xs font-medium', getLogColor(log.level))}>{log.level}</span>
                                  <span className="text-xs text-zinc-600">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                                </div>
                                <p className="text-sm text-zinc-400 break-words">{log.message}</p>
                                {log.target && <p className="text-xs text-zinc-600 mt-1">目标: {log.target}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </SettingCard>
              </motion.div>
            )}

            {activeTab === 'debug' && (
              <motion.div
                key="debug"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <Trash2 size={20} className="text-red-400" />
                      数据清除
                    </h3>
                    <p className="text-xs text-zinc-600 mb-4">清除所有历史数据，包括播放历史、喜欢列表、隐藏列表等</p>
                    <div className="space-y-3">
                      <SettingRow title="清除全部历史数据" description="清空播放历史、喜欢列表、隐藏列表、操作日志">
                        <button onClick={handleClearAllData} disabled={loading} className={cn(buttonDangerClass, 'bg-red-500 hover:bg-red-600 text-white')}>
                          清除全部
                        </button>
                      </SettingRow>
                      <SettingRow title="仅清除播放历史" description="保留喜欢列表和隐藏列表">
                        <button onClick={handleClearPlayHistory} disabled={loading} className={buttonDangerClass}>
                          清除
                        </button>
                      </SettingRow>
                    </div>
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="p-6">
                    <h3 className={sectionTitleClass}>
                      <AlertCircle size={20} className="text-yellow-400" />
                      操作日志
                    </h3>
                    <p className="text-xs text-zinc-600 mb-4">记录用户操作和后台执行情况，便于排查问题</p>
                    <div className="bg-black/30 rounded-xl p-4 max-h-96 overflow-y-auto border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-500">日志记录</span>
                        <div className="flex gap-2">
                          <button onClick={copyDebugLogs} className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-zinc-500 transition-colors">
                            复制
                          </button>
                          <button onClick={clearDebugLogs} className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-zinc-500 transition-colors">
                            清空
                          </button>
                        </div>
                      </div>
                      {operationLogs.length === 0 ? (
                        <div className="text-center py-4 text-zinc-600 text-sm">暂无操作记录</div>
                      ) : (
                        <div className="space-y-1 font-mono text-xs">
                          {operationLogs.map((log, index) => (
                            <div key={index} className="text-zinc-500">
                              [{log.timestamp}] {log.action}
                              {log.detail ? ` - ${log.detail}` : ''}
                              {log.error ? ` [错误: ${log.error}]` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </SettingCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
