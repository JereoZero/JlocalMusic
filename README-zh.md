# JlocalMusic 音乐播放器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)

一个基于 Tauri 2 + React 19 的本地音乐播放器，专注于简洁、高效的本地音乐管理体验。

![screenshot](screenshots/main.png)

## ✨ 特性

- 🚀 **轻量快速** - 基于 Tauri 2，包体积小，启动速度快
- 🎵 **格式丰富** - 支持 MP3、FLAC、WAV、DSF、DFF、OGG、AAC、M4A 等主流格式
- 🎤 **歌词支持** - 支持 LRC 歌词文件和内嵌歌词，自动同步滚动
- 🎨 **优雅界面** - 深色主题，动态背景色，流畅过渡动画
- 🔒 **本地优先** - 所有数据存储在本地，保护隐私
- 📁 **智能管理** - 多文件夹支持，自动清理已删除歌曲

## 🛠️ 技术栈

## 🎼 支持格式

| 格式 | 扩展名 | 状态 |
|------|--------|------|
| MP3 | .mp3 | ✅ 完整支持 |
| FLAC | .flac | ✅ 完整支持 |
| WAV | .wav | ✅ 完整支持 |
| DSF/DSD | .dsf, .dff, .dsd | ✅ 完整支持 |
| OGG Vorbis | .ogg, .oga | ✅ 完整支持 |
| AAC/M4A | .aac, .m4a | ✅ 完整支持 |
| NCM | .ncm | ⚠️ 仅识别，自动隐藏 |
| QMC | .qmc, .qmc0, .qmc3 | ⚠️ 仅识别，自动隐藏 |

> 💡 目前主要在 macOS Apple Silicon 平台开发测试，Windows/Linux 未来有望支持。

## 🛠️ 技术栈

本项目使用以下开源库：

### 前端
- [React](https://react.dev) - UI 框架 (MIT)
- [TypeScript](https://www.typescriptlang.org) - 编程语言 (Apache 2.0)
- [Tailwind CSS](https://tailwindcss.com) - CSS 框架 (MIT)
- [Zustand](https://zustand-demo.pmnd.rs) - 状态管理 (MIT)
- [Lucide React](https://lucide.dev) - 图标库 (ISC)
- [Vite](https://vitejs.dev) - 构建工具 (MIT)
- [Vitest](https://vitest.dev) - 测试框架 (MIT)

### 后端
- [Tauri](https://tauri.app) - 桌面应用框架 (MIT/APACHE-2.0)
- [Rust](https://www.rust-lang.org) - 编程语言 (MIT/APACHE-2.0)
- [rodio](https://docs.rs/rodio/) - 音频播放 (MIT)
- [Symphonia](https://github.com/pcherten/Symphonia) - 音频解码 (MPL 2.0)
- [lofty](https://docs.rs/lofty/) - 音频元数据 (MIT)
- [sqlx](https://github.com/launchbadge/sqlx) - 数据库 (MIT/APACHE-2.0)
- [tokio](https://tokio.rs) - 异步运行时 (MIT)

## 🚀 开发

### 前置要求
- Node.js 18+
- Rust 1.70+
- macOS (Apple Silicon)

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/your-username/jlocal.git
cd jlocal

# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建
npm run tauri:build
```

### 常用命令

```bash
npm run dev          # 前端开发
npm run typecheck    # 类型检查
npm test            # 运行测试
npm run lint        # 代码检查
```

## 📝 版本历史

### v0.7.6 (仅供测试)
> ⚠️ 仅用于测试上传到 GitHub 的流程，暂不收集反馈

- ✨ DSF/DFF/DSD 格式支持：使用 Symphonia 解码器播放和获取时长
- 🔧 扫描优化：自动清理已删除的歌曲
- 🐛 主文件夹/副文件夹管理修复
- 🎨 颜色过渡时间调整为 0.7 秒
- 🐛 修复数据库只读问题

### v0.7.0
- ✨ 动态背景色：根据专辑封面提取主题色
- ✨ 多文件夹支持：主文件夹 + 副文件夹
- 🎨 流畅过渡动画
- 🐛 修复播放器核心问题

### v0.6.5
- ✨ 新增歌词显示功能
- 📝 支持 LRC 歌词文件解析
- 🎵 支持内嵌歌词提取

### v0.6.4
- ✨ 新增歌词界面
- 🔧 优化隐藏/喜欢逻辑
- 🎨 改进侧边栏和播放栏 UI

### v0.6.0
- 🎨 全新界面设计
- ❤️ 支持歌曲喜欢/隐藏功能
- 📊 支持多种排序方式

### v0.5.0
- 🔊 重构播放器核心（Actor 模式）
- 📋 添加播放列表功能
- 🔁 支持循环播放模式

### v0.4.0
- 🎵 使用 rodio 音频库
- 🔊 添加音量控制
- 🔀 支持播放模式切换

### v0.3.0
- 🚀 开始迁移到 Tauri + Rust
- 🗄️ 引入 SQLite 数据库
- 🔍 基础元数据提取

### v0.2.0
- ❤️ 添加喜欢功能
- 📋 添加播放列表
- 🎵 基础元数据提取

### v0.1.0
- 🎵 基础音乐播放
- 📂 本地文件扫描
- ⚠️ 基于 Electron（后迁移到 Tauri）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 License

[MIT License](LICENSE)

---

*Made with ❤️ using Tauri + React*
