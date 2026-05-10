# Bug Records (2026-05-10)

## Bug 1: macOS 窗口顶部无法拖拽

### 现象
按住窗口最顶部的区域无法拖动窗口。

### 已尝试方案
1. `data-tauri-drag-region` 属性加在 Sidebar/App main/LyricsView 上
2. CSS `-webkit-app-region: drag` 在 `.titlebar` 类上
3. `getCurrentWindow().startDragging()` 编程式 API
4. 三层保险：`data-tauri-drag-region` + CSS + inline `WebkitAppRegion: 'drag'`
5. 移除 Sidebar 上的冲突拖拽区域

全部无效。

### 当前布局分析
App.tsx 中 titlebar 已放在最顶部（第一子元素）：
```tsx
<div className="h-screen flex flex-col ...">
  <div className="titlebar h-10 w-full flex-shrink-0"           ← 40px TOP
       data-tauri-drag-region
       style={{ WebkitAppRegion: 'drag' }} />
  <div className="flex-1 flex overflow-hidden">                  ← 内容区
    <Sidebar />
    <main>...</main>
  </div>
  <PlayerBar />                                                 ← 底部
```

### 可能根因
- **Tauri 2 Overlay + hiddenTitle 模式冲突**：Overlay 模式由 macOS 绘制红/黄/绿交通灯按钮（约 70×38px 区域），wry webview 可能拦截顶部鼠标事件用于交通灯定位/原生窗口管理，导致 `data-tauri-drag-region` 和 CSS 方案均失效。
- **`data-tauri-drag-region` 与 `-webkit-app-region` 双保险反而冲突**：Tauri 2 内部用 attribute 做编程式拖拽，CSS 方案是 WebKit 原生方案，两者在 Overlay 模式下可能互相干扰。

### 明天尝试方向
1. **只用 `data-tauri-drag-region`**，去掉 CSS `-webkit-app-region`，避免冲突
2. **尝试 `titleBarStyle: "Visible"` + 深色** 代替 Overlay 模式（最可靠方案）
3. **检查 tauri.conf.json 中 `dragDropEnabled` 配置**是否与此冲突

---

## Bug 2: 首次播放无声音（切歌后正常）

### 现象
- 应用启动后，点击播放第一首歌 → 无声音
- 拖动进度条 → 依然无声音
- 切换到下一首歌 → 声音正常
- 之后一切正常

### 已尝试方案
1. 创建临时 Sink 立即丢弃（`let _ = Sink::try_new(...)`） → 无效
2. 创建永久 Sink 保持存活（`sink = Some(s)`） → 无效
3. 永久 Sink + SineWave 440Hz 20ms 预热 → 无效
4. `first_play` 标记跳过首次 `s.stop()` → 无效

### 根因已定位

问题不在后端，在**前端 playerStore 状态恢复逻辑**！

#### 启动流程分析
```
app启动
  → restoreLastSong()
    → 设置 currentSong（UI显示上次歌曲）
    → 设置 isPlaying: false
    → 不调用 playSong() 或 resume()
    → 不发送 Play 命令到后端

用户点击播放按钮
  → togglePlay()
    → currentSong != null → 走 resume 分支
    → api.resumeSong()
    → 后端收到 Resume 命令
    → s.play()             ← Sink 中只有已播完的 SineWave
    → sink.empty() == true ← 无音频数据可播放
```

**关键问题**：`restoreLastSong` 恢复了前端的 UI 状态（currentSong 显示在界面上），但后端 Sink 中没有加载该歌曲的音频数据（只有已播完的 SineWave）。用户点击播放时，`togglePlay()` 调用 `resume()` 而不是 `playSong(currentSong.path)`，导致后端收到 Resume 命令后在空 Sink 上播放，无声音输出。

切歌时调用 `playSong(path)` → 发送 Play 命令 → `s.stop()` + `s.append(src)` + `s.play()` → 有声音，这是正常的。

#### 日志确认
```
INFO Permanent sink created, warming mixer with tone...  ← SineWave 已播完
INFO Audio pipeline warmed up and ready
INFO Resumed from 0.0s                                  ← Resume 空 Sink → 无声!
← 无 "Playing:" 日志，确认 Play 命令从未被调用
```

### 修复方案（一行代码）

在 `playerStore.ts` 的 `togglePlay()` 中，当 `currentSong` 存在且 `isPlaying=false` 时，改为调用 `playSong` 而非 `resume`：

**方案 A（推荐）**：`togglePlay` 中直接用 `playSong`
```typescript
// playerStore.ts -> togglePlay()
if (isPlaying) {
  await api.pauseSong()
  ...
} else {
  // 改为 playSong，确保后端加载了音频源
  await get().playSong(currentSong)
  // 或直接 api.playSong(currentSong.path)
}
```

**方案 B**：在 `restoreLastSong` 中后端也加载音频
```typescript
restoreLastSong: async () => {
  // 恢复UI状态后，异步加载音频到后端但暂停
  await api.playSong(song.path)
  await api.pauseSong()
  set({ isPlaying: false })
}
```
但此方案会增加启动耗时和音频加载开销。

---

## 解决优先级
1. **Bug 2（无声音）** → 一行代码可修复，优先解决 ✅ 方案明确
2. **Bug 1（拖拽）** → 需要验证 Overlay 模式兼容性，改为 titleBarStyle:"Visible" 或单用 data-tauri-drag-region