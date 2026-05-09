# Changelog

All notable changes to JlocalMusic will be documented in this file.

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
