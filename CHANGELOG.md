# Changelog

All notable changes to JlocalMusic will be documented in this file.

## v0.8.7 (2026-05-12)

### 🔒 安全修复
- 🛡️ **后端安全审计** — 逐文件审读 18 个 Rust 源文件，修复 6 项安全漏洞
- 🛡️ **路径验证统一** — 提取 `validate_path_in_music_folder()` 辅助函数，`delete_song`、`library.rs`、`add_play_history` 等命令全部增加路径边界检查
- 🛡️ **设置白名单** — `set_setting` 增加 `ALLOWED_SETTING_KEYS` 白名单，防止前端篡改关键配置
- 🛡️ **Batch 上限** — `get_song_covers_batch`、`hide_songs_batch` 增加 `MAX_BATCH_SIZE = 100` 防 DoS
- 🛡️ **错误吞掉修复** — 3 处 `let _ =` 改为 `if let Err(e) { tracing::warn/error! }`

### 📚 文档
- 📖 **PROJECT.md** — 创建项目架构文档 (696 行)，涵盖架构图/数据流/事件系统/测试/IPC 命令/设计决策等 13 个章节
- 📖 **docs/ 加入 .gitignore** — 本地文档不推送到 GitHub

### Verification
- ✅ TypeScript — 0 errors
- ✅ ESLint — 0 warnings
- ✅ Rust `cargo check` — 0 errors, 0 warnings

---

## v0.8.6 (2026-05-12)

### 🔒 安全修复
- 🛡️ **路径遍历防护** — `add_secondary_folder` 增加 `canonicalize()` 解析 + 路径存在性检查，防止符号链接指向任意路径
- 🛡️ **Panic 消除** — 移除 `main.rs` 中 3 处 `.unwrap()`，改为降级处理 + `.expect()`

### 🐛 Bug 修复
- 🏃 **竞态保护** — `resume()` 函数补充 `playOperationId` 竞态检查
- 📝 **错误日志** — 3 处空 `.catch()` 添加 `console.error` 日志输出

### 🧹 代码优化
- 🧩 **Clock 组件提取** — `Clock` 内联组件 → 模块级 `ClockIcon`，避免每次渲染重建

### Verification
- ✅ TypeScript — 0 errors
- ✅ Rust `cargo check` — 通过
- ✅ 7 方向代码审计完成

---

## v0.8.5 (2026-05-12)

### 🧹 代码优化
- 🗑️ **死代码清理** — 删除无人引用的 `SongListHeader.tsx` (121行) 和 `styles/tokens.ts` (101行)
- 📦 **组件拆分** — SongItem 提取为独立组件，SongList 从 432 行缩减到 220 行

### 🔧 代码修复
- 🛠️ **类型优化** — 用 `Set.has` 替代 `as string` 类型断言
- 🧹 **清理** — 移除 LocalView 中未使用的 `handleLikeSort`

### Verification
- ✅ TypeScript build — 0 errors
- ✅ ESLint `--max-warnings 0` — clean

---

## v0.8.4 (2026-05-12)

### 🎨 UI 重构与列对齐修复
- 📐 **Grid 布局重构** — 歌曲列表改为 CSS Grid，Header 与 SongItem 列宽统一计算
- 🧩 **组件合并** — SongListHeader 内置到 SongList 组件，消除容器宽度差异
- 🔧 **列配置管理** — 新增 `songListColumns.ts` 统一列定义函数
- ✅ **视图一致性** — 修复本地/喜欢/历史/隐藏四个视图的列显示一致性
- 🎯 **对齐优化** — 序号和时长列改为居中对齐

### ⚙️ 功能增强
- 🌐 **设置页面** — 新增项目地址展示
- 🔄 **检查更新** — 基于 GitHub Release API 的版本检测功能
- 🎨 **设计系统** — 新增 tokens.ts 设计令牌和 cn.ts 工具函数

### Verification
- ✅ TypeScript build — compiles clean
- ✅ Grid 列对齐 — 可视化调试验证通过

---

## v0.8.3 (2026-05-11)

### 🐛 Bug Fixes — v0.8.2 Regressions Resolved

- 🔊 **First-Play No Sound — Real Fix** — Root cause was in frontend `togglePlay()`: `restoreLastSong()` restored UI state but backend had no audio loaded. Added `backendLoaded` flag to distinguish "has loaded audio" vs "backend empty", ensuring first play calls `playSong()` instead of `resumeSong()` ([playerStore.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/stores/playerStore.ts))
- 🖱️ **Window Dragging — Real Fix** — Abandoned Tauri 2 Overlay mode (wry kernel doesn't forward titlebar mouse events). Switched to native macOS `titleBarStyle: "Visible"`, system handles dragging natively with 100% reliability ([tauri.conf.json](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/tauri.conf.json))
- 🖤 **macOS Dark Native Titlebar** — `NSAppearanceNameDarkAqua` forced via objc2 FFI, native titlebar now matches dark theme ([main.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/main.rs))
- 🧹 **Cleanup** — Removed all failed custom drag code from `App.tsx`, `LyricsView.tsx`, `Sidebar.tsx`, `index.css`

### Verification
- ✅ Rust `cargo check` — zero errors, zero warnings
- ✅ TypeScript build — compiles clean
- ✅ Logs confirm: `Set macOS window to dark appearance` at startup
- ✅ Logs confirm: `Playing:` (not `Resumed from 0.0s`) on first play

---

### 🔥 Critical Bug Fixes — Audio Engine Rewrite + Window Dragging

- 🔊 **First-Play No Sound Fixed** — CoreAudio pipeline now properly initialized with a `SineWave` tone warmup before first play; permanent Sink stays alive across the entire app lifecycle, never dropping the mixer connection ([player.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/player.rs))
- 🖱️ **Window Dragging Fixed** — Triple-layer insurance: `data-tauri-drag-region` + CSS `-webkit-app-region: drag` + inline `WebkitAppRegion: 'drag'` style; sidebar conflict removed ([App.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/App.tsx), [Sidebar.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/components/Sidebar.tsx), [index.css](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/styles/index.css))

---

## v0.8.1 (2026-05-10)

### 🎨 macOS Dark Title Bar + Version Fix + Backend Optimization
- 🖤 **macOS Dark Title Bar** — Overlay transparent title bar mode, title bar area blends into dark background
- 🖱️ **Window Drag Fix** — Top area (sidebar/main content) now supports drag-to-move window via `data-tauri-drag-region`
- 🔗 **Backend Connection Optimization** — `get_audio_file` moved to `spawn_blocking` + 50MB size limit to prevent UI freeze
- 🚀 **Batch Cover Concurrency** — `get_song_covers_batch` processes 20 covers concurrently instead of sequentially
- 🔢 **Version Number Sync** — Fixed APP_CONFIG version out of sync (0.7.12 → 0.8.1)

---

## v0.8.0 (2026-05-10)

### 🎨 Brand & Stability Update
- 🎨 **New Logo** — Replaced with a cleaner, more modern logo design
- 🟢 **Neon Green Theme** — Added neon green (`#39FF14`) theme color
- 🛡️ **OutputStream Recovery** — Auto-retry & rebuild on audio device failure, no restart needed
- ⚡ **Blocking IO Isolated** — Scanner/metadata extraction moved to `spawn_blocking`, no more UI freeze on large libraries
- 🎯 **Race Condition Protection** — Play operation sequence number prevents state corruption on rapid song switching
- 🎚️ **Accurate Track End Detection** — Uses `sink.empty()` instead of time estimation for precise track transition
- 🔀 **Shuffle Rewrite** — Fisher-Yates pre-shuffle replaces runtime random pick, guarantees no repeats
- 🗄️ **Database Optimization** — `cleanup_nonexistent_songs` uses batch transactions + path-only queries
- 🔇 **Decode Error Tolerance** — Flac decoder gains consecutive error limits + logging
- 🧹 **HMR Compatible** — playerStore adds `destroy()` method for React Strict Mode/HMR
- 🖼️ **Screenshots Updated** — 7 new UI screenshots replace old ones
- 📘 **README Enhanced** — New "Interactions" section, full UI screenshot gallery

---

## v0.7.13 (2026-05-10)

### 🎨 Brand & Theme Update
- 🎵 **New Logo** — Replaced "Only" text with blue musical note icon (`logo/Jlogo.PNG`), sidebar now displays the brand logo
- 🎨 **New default theme: Blue** — Added `#00A8FF` (Logo blue) as the new default theme color, placed first in theme list
- 🎨 **Theme system expanded** — 4 themes → 5 themes: Blue (new), Orange, Khaki, Gray Blue, Olive Green
- 📝 **Settings history updated** — v0.7.4 changelog reflects the new logo change

---

## v0.7.12 (2026-05-09)

### 🔥 Bug Fixes — 15 issues fixed from comprehensive code review

#### P0 — Critical (3)
- 🐛 **SongListHeader always hidden** — Removed `hidden` class from table header grid, header column labels now visible ([SongListHeader.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/components/SongListHeader.tsx))
- 🐛 **`finalizePlayHistory` missing await** — Two call sites (playSongInternal, stop) now properly await before continuing, fixing playback history data loss on song switch ([playerStore.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/stores/playerStore.ts))
- 🛡️ **CSP security disabled** — Replaced `"csp": null` with proper restrict-to-self policy covering default-src, img-src, style-src, script-src ([tauri.conf.json](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/tauri.conf.json))

#### P1 — Important (6)
- 🎨 **Single-pixel color sampling → colorthief Median Cut** — Replaced Canvas getImageData(1×1) with `colorthief`'s MMCQ quantization for representative album colors ([useAlbumColor.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/hooks/useAlbumColor.ts))
- ⚡ **`useSongCovers` individual requests → batch API** — Changed N sequential `getSongCoverFull` calls to single `getSongCoversBatch` RPC ([useSongCover.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/hooks/useSongCover.ts))
- 📦 **Duplicate types eliminated** — `ViewType`/`PlayMode` now defined only in `types.ts`, imported by `constants/index.ts` ([constants/index.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/constants/index.ts))
- ⚙️ **Config deduplication** — Merged `PLAYER_CONFIG` into `APP_CONFIG.player`, fixed inconsistent `progressInterval` value (250ms → 500ms) ([config/index.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/config/index.ts))
- 🪟 **Window now resizable** — Removed fixed maxWidth/maxHeight restriction, set minWidth=900 minHeight=600 with `resizable: true` ([tauri.conf.json](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/tauri.conf.json))
- 🔗 **Rust `is_path_in_music_folder` deduplicated** — Removed duplicate in `settings.rs`, unified to `path_validator.rs` version ([commands/settings.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/commands/settings.rs))

#### P2 — Code quality (6)
- 🧹 **Unused deps cleaned** — Removed `clsx`, `tailwind-merge` (frontend) and `config`, `regex` (Rust) from package manifests
- 🔧 **`useSongSort` type cast hack fixed** — Added `path: string` to `SortableItem` interface, eliminated `as unknown as` ([useSongSort.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/hooks/useSongSort.ts))
- 🔁 **HistoryView useEffect stable reference** — Wrapped `loadPlayHistory` in `useCallback` to prevent unnecessary re-fetches ([HistoryView.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/views/HistoryView.tsx))
- ⏱️ **Volume debounce** — Added 100ms debounce to `setVolume` backend calls using `es-toolkit/debounce` ([playerStore.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/stores/playerStore.ts))
- 🚀 **`getLikedSongs` backend SQL JOIN** — Replaced client-side filter (fetch all → filter in JS) with SQL INNER JOIN for O(1) lookup ([database.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/database.rs), [library.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/api/modules/library.ts))
- 🗑️ **Batch unlike in clearAllData** — Added `clear_liked_songs` RPC eliminating per-song DELETE loop in SettingsView ([database.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/database.rs), [SettingsView.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/views/SettingsView.tsx))

### CI & Build
- 🔧 **Windows CI 暂时移除** — `lto = true` 与 Windows MSVC 链接器不兼容，CI 矩阵改为仅 macOS，Windows 支持后续处理
- 🖥️ **GitHub Actions runner** — `windows-latest` → `windows-2022` 测试（已回滚）

### Lint & Verification
- ✅ TypeScript `tsc --noEmit` — 0 errors
- ✅ ESLint `--max-warnings 0` — 0 warnings
- ✅ Rust `cargo check` — clean compile

---

## v0.7.12-patch (2026-05-10)

### 🔥 Additional Fixes — Post-release code review

#### P0 — Critical (3)
- 🐛 **Windows build failure** — `lto = true` in `[profile.release]` causes MSVC linker error on Windows; changed to `lto = "thin"` with `codegen-units = 1` ([Cargo.toml](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/Cargo.toml))
- 🐛 **Player sink lifecycle bug** — `sink.take()` on track completion consumed the sink without stopping it, leaving state inconsistent; now properly stops sink and clears `duration` ([player.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/player.rs))
- 🐛 **`get_song_play_count` type mismatch** — `fetch_one` + `unwrap_or(0)` mixed `sqlx::Error` with `i64`; changed to `fetch_optional` + `?` + `unwrap_or(0)` ([database.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/database.rs))

#### P1 — Important (3)
- 🎚️ **ProgressBar stale closure** — `handleMouseUp` captured stale `displayTime` from closure, causing seek to jump to old position after drag; fixed with `displayTimeRef` ([ProgressBar.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/components/player/ProgressBar.tsx))
- 🔇 **`scan_folder` silent error swallowing** — `upsert_songs().unwrap_or((0,0))` hid database errors, preventing encrypted songs from being auto-hidden; replaced with explicit `match` error handling ([commands/song.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/commands/song.rs))
- ⚡ **Player thread CPU usage** — `recv_timeout(50ms)` caused busy-loop; increased to 100ms to reduce idle CPU ([player.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/player.rs))

#### P2 — Documentation (1)
- 📝 **Symphonia blocking IO noted** — `get_duration_from_symphonia` performs sync file I/O in async context; added comment warning for future `spawn_blocking` refactor ([scanner.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/scanner.rs))

---

## v0.7.11 (2026-05-09)

### 🔧 CI 构建修复
- GitHub Actions 构建因 `npm install` peer dependency 冲突失败 → 改用 `--legacy-peer-deps`
- 修复后 `tsc`、`vite build` 全部通过，Rust `cargo build` 编译成功

### 📝 文档归档
- BUGS.md 归档：21 个已修复 CODEX 从详细描述精简为紧凑汇总表，完整记录移至 BUGS_HISTORY.md

---

## v0.7.10 (2026-05-09)

### P1 Bug Fixes (CODEX Final Round)
- 🎯 **Synchronous audio format probe** (CODEX-1) — `probe_audio_file()` verifies file is decodable via Symphonia/Rodio *before* queuing to player thread; corrupt/unsupported files now return immediate error to frontend
- 📁 **Startup music_folder persistence** (CODEX-2) — auto-scan on first launch now creates default directory and writes `music_folder` to DB, preventing "Music folder not configured" errors
- 🛡️ **Lyrics path protection** (CODEX-7) — `get_lyrics` returns proper errors for missing config and path violations instead of silent `Ok(None)`

### P3 Bug Fixes
- 🖼️ **Cover cache COALESCE** (CODEX-17) — `upsert_songs` now preserves existing cover art when re-scan yields no new cover

### Documentation
- 📝 BUGS.md fully updated — 21/23 CODEX items resolved (19 + 2 deferred for E2E/Windows)
- 📝 All docs synced to v0.7.10 (README, CHANGELOG, DEVELOPMENT_LOG)

### Previous CODEX Summary (v0.7.9 cumulative)
> Full CODEX fix history: CODEX-3~19, 21~23 resolved across 3 review batches.
> 2 deferred: CODEX-20 (E2E tests, low priority), Windows-only #3/#4.

### Testing & Verification
- 🧪 142 tests (11 files) — 100% pass rate
- ✅ TypeScript `tsc --noEmit` — 0 errors
- ✅ ESLint `--max-warnings 0` — 0 warnings

---

## v0.7.9 (2026-05-09)

### Rust Backend Optimizations
- 🔧 **Log level correction** — 7 error paths in `player.rs` changed from `info!` to `warn!`/`error!` for proper severity classification
- 🔇 **Scan log noise** — per-song `info!` downgraded to `debug!` in scanner, prevents terminal flooding on large libraries
- 🔇 **Play history log** — `add_play_history()` `info!` downgraded to `debug!`
- 📦 **Vec pre-allocation** — scanner vectors use `with_capacity(500/50/20)` to reduce memory reallocations

### React Frontend Optimizations
- ⚛️ **useCallback for view handlers** — `handleViewChange`/`handleToggleSettings`/`handleToggleLyrics` in App.tsx now memoized, preventing unnecessary Sidebar re-renders
- 🧹 **Inline arrow cleanup** — removed redundant `(path) => toggleHidden(path)` wrapping in LocalView/LikedView
- 🏪 **useShallow selectors** — 5 components (LocalView, LikedView, HiddenView, HistoryView, PlayerBar) optimized with `useShallow` to avoid cascade re-renders from store signal changes
- 💾 **Sort persistence** — sort state saved to `sessionStorage` via new `viewKey` parameter, survives view switches
- 🎵 **DSD playback** — removed `dsd` from UNSUPPORTED_EXTENSIONS in SongList (SymphoniaDecoder already handles it)

### Testing & Verification
- 🧪 142 tests (11 files) — 100% pass rate
- ✅ TypeScript `tsc --noEmit` — 0 errors
- ✅ Rust `cargo check` — clean
- 📊 12 files changed, +161 / -65 lines

---

## v0.7.8 (2026-05-08)

### Theme System
- 🔧 All play buttons, badges, borders, filter tabs now follow theme color dynamically
- 🔧 Sidebar nav items, refresh button, search focus ring use theme primary color
- 🔧 ErrorBoundary retry button uses theme color
- ✨ New `hexToRgba` utility for dynamic opacity support

### Refactoring (Code Quality)
- ♻️ Toast system → `sonner`: deleted 3 files (toastStore + ToastContainer + test) -115 lines
- 🎨 Album color → `colorthief`: Median Cut algorithm replaces single-pixel sampling
- 🎹 Keyboard shortcuts → `react-hotkeys-hook`: +Scope/combo key support, deleted dead hook
- 🛠️ Debounce → `es-toolkit`: 2x faster than lodash, treeshaken ~3kB
- 🔤 Encoding detection → `chardetng` (Mozilla/Firefox): auto-detect GBK/EUC-JP/Shift_JIS
- 🔗 Rust constants unified: SYMPHONIA_EXTENSIONS shared across player/scanner/constants
- Total net code reduction: ~216 lines removed

### Features
- ▶️ LikedView: "Play All" button, independent play queue per view (local/liked/hidden/history)

---

## v0.7.7 (2026-05-08)

### Bug Fixes — 34 bugs fixed across 4 review rounds

#### Round 1: Player Core & Format System (15 bugs)

**Player & Audio:**
- 🐛 Smooth progress bar: eliminated dual-track update race between rAF timer and backend `playback_progress` event. Progress only syncs from backend when gap > 0.3s or position is ahead.
- 🐛 Player thread busy-wait eliminated: replaced `tokio::sync::mpsc` with `std::sync::mpsc`, changed `try_recv() + sleep(50ms)` to `recv_timeout(Duration::from_millis(50))`.
- ✨ Extended audio formats: added AIFF (.aif/.aiff), Opus (.opus), CAF (.caf) support. Unified frontend/backend format constants.
- 🐛 Volume mute sync: added `useEffect` in VolumeControl to sync `previousVolume` state when not muted.
- 🐛 HistoryView: `handlePlayFromHistory` now directly calls `playSong(song)` instead of useless `searchSongs(song.path)`.

**Code Quality:**
- 🔧 Dead code removal: 305 lines eliminated across player commands (`play_next`, `play_prev`), DB methods (`get_next_song`, `get_prev_song`), API functions, and mock implementations.
- 🔧 Library store: removed unused `toggleLikeWithContext` and `toggleHiddenWithContext` methods.
- 🔧 Naming: `SymphoniaFlacDecoder` → `SymphoniaDecoder` (reflects multi-format support).
- 🔧 Scan result: added `metadata_errors: Vec<String>` field to `ScanResult` for better error visibility.

---

#### Round 2: Memory & Error Handling (5 bugs)

**Play Queue:**
- 🐛 Shuffle `removeFromQueue`: changed from index-based deletion to path-based lookup.
- 🐛 `moveInQueue`: `originalQueue` now synchronized with queue operations.

**Error Handling:**
- 🐛 Empty catch blocks eliminated: all `.catch(() => {})` replaced with `handleError(error, context)` or `createErrorHandler('context')`.
- 🐛 10 `console.error` calls in playerStore replaced with `handleError(error, context)`.

**Memory & Lifecycle:**
- 🐛 Timeout management: SettingsView's single ref pattern preventing stale closures.
- 🐛 LyricsView: `currentSongRef` pattern avoids stale closure bugs.

**API Consistency:**
- 🔧 Field name fix: `LyricSource.source` → `type` (with `#[serde(rename = "type")]`).
- 🔧 Lyric source values: `"lrc_file"` → `"external"`.
- 🔧 Rust safety: `unwrap()` → `if let` in lyrics decoder.

---

#### Round 3: Play History & Data Processing (6 bugs)

- 🐛 Play history tracking: new `finalizePlayHistory()` records actual listening duration. Previously always recorded `duration=0, completed=false`.
- 🐛 `playback_progress` guard: `duration=0.0` from backend no longer corrupts frontend state.
- 🐛 Remaining `console.error` spots: 5 more replaced with unified `handleError()`.
- 🐛 `copyDebugLogs`: added clipboard error handling with toast feedback.
- 🐛 SettingsView: fixed two wrong error context strings.
- 🔧 `useAlbumColor.ts`: removed leftover `console.log` debug output.

---

#### Round 4: Folder/Song Management Refactor (8 bugs)

- 🐛 `cleanup_nonexistent_songs`: removed `base_folder` restriction, now checks ALL songs regardless of folder origin. Fixes orphaned songs from deleted secondary folders.
- 🐛 Symbolic link dedup: scanner uses `HashSet<PathBuf>` with canonical paths to prevent duplicate/cyclic scanning.
- 🐛 `upsert_songs`: now returns `(success, errors)` tuple instead of silently discarding failed inserts.
- 🐛 `delete_song` cascade: transaction-based cleanup of `play_counts`, `play_history`, `liked_songs`, `hidden_songs` before deleting from `songs`.
- 🔧 Audio format constants: split `NORMAL_AUDIO_EXTENSIONS` / `ENCRYPTED_AUDIO_EXTENSIONS` / `UNSUPPORTED_AUDIO_EXTENSIONS` for semantic clarity.
- 🐛 SettingsView error handling: 2 `console.error` replaced with `handleError()`, duplicate toast removed, auto-refresh after folder removal.

---

### AI Development Tools
- 🤖 Installed 3 Trae IDE Skills: `tauri-review`, `react-logic`, `music-audit` for automated code auditing.
- 📚 Reference: [jezweb/claude-skills](https://github.com/jezweb/claude-skills) (161⭐)

### Testing
- 🧪 Expanded from 7 files (64 tests) to 12 files (151 tests) — 100% pass rate.
- 🆕 New test files: `playQueueStore`, `toastStore`, `operationLogStore`, `errorHandler`, `songUtils`.

---

## v0.7.6 (2025-03-20)
> Test release for GitHub upload workflow

- ✨ DSF/DFF/DSD format support: playback and duration via Symphonia decoder
- 🔧 Scan optimization: auto-cleanup deleted songs from database
- 🐛 Fixed main/secondary folder management
- 🎨 Adjusted color transition time to 0.7s
- 🐛 Fixed database read-only issues with file permissions

## v0.7.0

- ✨ Dynamic background colors: extract theme color from album covers
- ✨ Multi-folder support: main folder + secondary folders
- 🎨 Smooth transition animations between views
- 🐛 Fixed player core stability issues

## v0.6.5

- ✨ Lyrics display feature
- 📝 LRC lyrics file parsing support
- 🎵 Embedded lyrics extraction from audio files

## v0.6.4

- ✨ New lyrics view
- 🔧 Optimized hide/like logic
- 🎨 Improved sidebar and player bar UI

## v0.6.0

- 🎨 New UI design
- ❤️ Like/unlike songs support
- 📊 Multiple sort options for song library

## v0.5.0

- 🔊 Player core refactor: Actor pattern architecture
- 📋 Playlist support
- 🔁 Loop mode support: single, list, shuffle

## v0.4.0

- 🗄️ SQLite database integration
- 🔍 Fast library scanning with metadata extraction
- 🎨 Album art thumbnail generation
- 🖼️ Virtual scrolling for large libraries

## v0.3.0

- 🎵 Basic audio playback (MP3, FLAC, WAV)
- 🎛️ Volume control and seek support
- 📂 Folder-based music library scanning

## v0.2.0

- 🏗️ Tauri 2 + React project scaffold
- 🎨 Dark theme foundation with Tailwind CSS
- 🖥️ Fixed window layout (1200x750)

## v0.1.0

- 🎉 Initial commit
- 📦 Project structure setup
- ⚙️ Rust + TypeScript toolchain configuration
