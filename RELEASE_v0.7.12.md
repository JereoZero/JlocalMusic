# JlocalMusic v0.7.12 Release Notes

> **代码全面审查修复版本** — 修复 15 个问题，涵盖 3 个严重 BUG、6 个重要问题和 6 个代码质量改进。

---

## 🚨 重点 Bug 介绍

### P0 — Critical (3)

#### 1. 🐛 SongListHeader 表头永远不显示
**文件**: [SongListHeader.tsx](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/components/SongListHeader.tsx)  
**问题**: className 以 `hidden` 开头（`className="hidden grid grid-cols-..."`），`hidden` 是 Tailwind 的 `display: none`，导致歌曲列表表头列标签（序号、封面、标题、时长等）完全不可见。  
**修复**: 移除 `hidden` 类，表头标签正常显示。

#### 2. 🐛 播放历史可能丢失
**文件**: [playerStore.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/stores/playerStore.ts)  
**问题**: `finalizePlayHistory()` 是异步函数，但两处调用（切歌时 `playSongInternal`、停止时 `stop`）都缺少 `await`。切歌时前一首歌的播放历史还没写入数据库，就开始记录下一首了。  
**修复**: 两处调用添加 `await`，确保历史记录按顺序写入。

#### 3. 🛡️ CSP 安全策略完全禁用
**文件**: [tauri.conf.json](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/tauri.conf.json)  
**问题**: `"csp": null` 等于完全禁用内容安全策略，存在 XSS 攻击风险。  
**修复**: 配置合理的 CSP 规则：`default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`

---

### P1 — Important (6)

#### 4. 🎨 专辑色提取：单像素采样 → colorthief Median Cut 算法
**文件**: [useAlbumColor.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/hooks/useAlbumColor.ts)  
**问题**: 之前用 Canvas `getImageData(x, y, 1, 1)` 只取封面图右上角一个点的颜色，完全不具代表性。虽然项目已安装 `colorthief` 但从未真正使用。  
**修复**: 改用 colorthief 的 MMCQ（Median Cut 量化）算法，从全局像素提取主色调。

#### 5. ⚡ 批量封面请求优化
**文件**: [useSongCover.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/hooks/useSongCover.ts)  
**问题**: `useSongCovers` 对所有未缓存的封面逐个调用 `getSongCoverFull`，N 首歌就发起 N 次 Tauri RPC 调用。  
**修复**: 使用已有的 `getSongCoversBatch` 批量 API，一次 RPC 获取全部未缓存封面。

#### 6. 📦 类型/配置重复定义
**文件**: [constants/index.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/constants/index.ts), [config/index.ts](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src/config/index.ts)  
**问题**: `ViewType`/`PlayMode` 在 `types.ts` 和 `constants/index.ts` 各定义一份，易不一致。`PLAYER_CONFIG.defaultVolume` 和 `APP_CONFIG.player.defaultVolume` 重复，且 `progressInterval`(250ms) 与 `progressUpdateInterval`(500ms) 值不一致。  
**修复**: 统一到单一来源，所有不一致的配置项对齐。

#### 7. 🪟 窗口不可调整大小
**文件**: [tauri.conf.json](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/tauri.conf.json)  
**问题**: `maxWidth=1200, maxHeight=750, minWidth=1200, minHeight=750, resizable=false` 用户完全无法调整窗口。  
**修复**: 设 `resizable: true`，`minWidth=900, minHeight=600`，无上限制。

#### 8. 🔧 Rust `is_path_in_music_folder` 重复实现
**文件**: [commands/settings.rs](file:///Volumes/JZMAC-1T/trae/mus1/Jlocal/jlocal/src-tauri/src/commands/settings.rs)  
**问题**: `path_validator.rs` 和 `settings.rs` 各实现了一份路径安全校验函数，逻辑略有不同。  
**修复**: 删除 `settings.rs` 中的简化版本，统一使用 `path_validator.rs` 的更完善实现。

---

### P2 — Code Quality (6)

#### 9. 🧹 未使用依赖清理
移除前端 `clsx`、`tailwind-merge`（2 个包），Rust 端 `config`、`regex`（2 个 crate）。

#### 10. 🔧 `useSongSort` 类型转换 hack
`(a as unknown as { path: string }).path` → 改为 `a.path`，泛型接口 `SortableItem` 添加 `path` 字段。

#### 11. 🔁 HistoryView `useEffect` 引用不稳定
`loadPlayHistory` 函数每次渲染重新创建，导致 `useEffect` 依赖为空数组却不稳定 → 用 `useCallback` 包装。

#### 12. ⏱️ 音量调节无防抖
快速拖动音量滑动条每次触发后端 RPC 调用 → 使用 `es-toolkit/debounce` 100ms 防抖。

#### 13. 🚀 `getLikedSongs` SQL JOIN 优化
之前：先获取全部歌曲（`getSongs()` 全表查询）+ 在 JS 端过滤 → 改为 SQL `INNER JOIN liked_songs` 直接返回喜欢歌曲。

#### 14. 🗑️ `handleClearAllData` 批量取消喜欢
之前：逐首调用 `toggleLike(path, false)` → 新增后端 `clear_liked_songs` 命令，一条 SQL 清空全部。

---

## ✅ 验证

| 检查项 | 结果 |
|--------|------|
| TypeScript `tsc --noEmit` | ✅ 0 errors |
| ESLint `--max-warnings 0` | ✅ 0 warnings |
| Rust `cargo check` | ✅ Clean compile |

---

## 🔧 Files Changed

**Frontend (11 files)**:
- `src/components/SongListHeader.tsx` — 移除 hidden
- `src/stores/playerStore.ts` — await finalizePlayHistory, 音量防抖
- `src/constants/index.ts` — 导入类型替代重复定义
- `src/config/index.ts` — 合并 PLAYER_CONFIG
- `src/hooks/useAlbumColor.ts` — colorthief Median Cut
- `src/hooks/useSongCover.ts` — 批量 API
- `src/hooks/useSongSort.ts` — 修复类型转换 hack
- `src/views/HistoryView.tsx` — useCallback 稳定引用
- `src/views/SettingsView.tsx` — 批量取消喜欢
- `src/api/modules/library.ts` — SQL JOIN + clear_liked_songs
- `src/api/mock-api.ts` — clear_liked_songs mock

**Backend (4 files)**:
- `src-tauri/src/commands/settings.rs` — 路径验证去重
- `src-tauri/src/database.rs` — get_liked_songs JOIN, clear_liked_songs
- `src-tauri/src/commands/song.rs` — 新增命令
- `src-tauri/src/main.rs` — 注册命令

**Config (2 files)**:
- `package.json` — 移除 clsx/tailwind-merge
- `src-tauri/Cargo.toml` — 移除 config/regex
- `src-tauri/tauri.conf.json` — CSP + resizable

**Docs (4 files)**:
- `CHANGELOG.md` — v0.7.12 日志
- `README.md` — v0.7.12 日志 (EN)
- `README-zh.md` — v0.7.12 日志 (ZH)