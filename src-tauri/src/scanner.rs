use crate::database::Song;
use crate::metadata::MetadataExtractor;
use crate::ncm::is_ncm_file;
use crate::qmc::is_qmc_file;
use crate::constants::{is_audio_extension, is_encrypted_extension};
use chrono::Utc;
use serde::Serialize;
use std::path::Path;
use tracing::{info, warn};
use ts_rs::TS;
use uuid::Uuid;
use walkdir::WalkDir;

/// 扫描结果
#[derive(Serialize, TS)]
#[ts(export)]
pub struct ScanResult {
    /// 正常歌曲（可以播放）
    pub normal_songs: Vec<Song>,
    /// 加密歌曲（NCM/QMC 等会员歌曲）
    pub encrypted_songs: Vec<Song>,
}

/// 文件夹扫描器
pub struct FolderScanner;

impl FolderScanner {
    pub fn new() -> Self {
        Self
    }

    /// 扫描文件夹
    pub async fn scan(&self, folder_path: &str) -> anyhow::Result<ScanResult> {
        info!("Starting folder scan: {}", folder_path);

        let mut normal_songs = Vec::new();
        let mut encrypted_songs = Vec::new();
        let mut scanned = 0usize;
        let mut success = 0usize;
        let mut errors = 0usize;

        let extractor = MetadataExtractor::new();

        for entry in WalkDir::new(folder_path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            
            if !path.is_file() {
                continue;
            }

            scanned += 1;

            // 处理音频文件
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                
                // 支持的格式（非加密）
                let is_supported = is_audio_extension(&ext_lower) && !is_encrypted_extension(&ext_lower);
                
                // 加密格式（NCM/QMC）
                let is_encrypted = is_ncm_file(path) || is_qmc_file(path) || is_encrypted_extension(&ext_lower);
                
                if is_supported {
                    // 支持的格式 - 正常处理
                    info!("Processing supported file: {:?} ({})", path.file_name(), ext_lower);
                    match self.process_normal_file(path, &extractor).await {
                        Some(song) => {
                            normal_songs.push(song);
                            success += 1;
                        }
                        None => {
                            errors += 1;
                            warn!("Failed to process file: {:?}", path);
                        }
                    }
                } else if is_encrypted || Self::is_unsupported_format(&ext_lower) {
                    // 不支持的格式（包括加密格式）- 自动隐藏
                    if let Some(song) = self.process_unsupported_file(path, &ext_lower, is_encrypted).await {
                        encrypted_songs.push(song);
                        info!("Found unsupported song: {:?} ({})", path.file_name(), ext_lower);
                    }
                }
            }
        }

        info!(
            "Folder scan completed. Scanned: {}, Normal: {}, Encrypted: {}, Errors: {}",
            scanned,
            normal_songs.len(),
            encrypted_songs.len(),
            errors
        );

        let _ = scanned;
        let _ = success;
        let _ = errors;

        Ok(ScanResult {
            normal_songs,
            encrypted_songs,
        })
    }

    /// 处理正常音频文件
    async fn process_normal_file(
        &self,
        path: &Path,
        extractor: &MetadataExtractor,
    ) -> Option<Song> {
        let path_str = path.to_string_lossy().to_string();

        // 尝试提取元数据，如果失败则使用默认值
        let metadata = match extractor.extract(&path_str).await {
            Ok(m) => Some(m),
            Err(e) => {
                warn!("Failed to extract metadata from {:?}: {}, using defaults", path, e);
                // 元数据提取失败时仍然创建歌曲条目
                None
            }
        };

        // 如果 lofty 没有获取到时长，尝试用 Symphonia 获取
        let duration = if let Some(ref m) = metadata {
            if m.duration > 0.0 {
                m.duration
            } else {
                self.get_duration_from_symphonia(&path_str).unwrap_or(0.0)
            }
        } else {
            self.get_duration_from_symphonia(&path_str).unwrap_or(0.0)
        };

        let filename = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let song = Song {
            id: Uuid::new_v4().to_string(),
            title: metadata.as_ref().and_then(|m| m.title.clone()).unwrap_or_else(|| filename.clone()),
            artist: metadata.as_ref().and_then(|m| m.artist.clone()).unwrap_or_else(|| "Unknown Artist".to_string()),
            album: metadata.as_ref().and_then(|m| m.album.clone()).unwrap_or_else(|| "Unknown Album".to_string()),
            duration,
            path: path_str,
            cover: metadata.and_then(|m| m.cover),
            play_count: 0,
            created_at: Utc::now(),
            is_liked: None,
        };

        Some(song)
    }

    /// 使用 Symphonia 获取音频时长
    fn get_duration_from_symphonia(&self, path: &str) -> Option<f64> {
        use symphonia::core::codecs::CODEC_TYPE_NULL;
        use symphonia::core::formats::FormatOptions;
        use symphonia::core::io::MediaSourceStream;
        use symphonia::core::meta::MetadataOptions;
        use symphonia::core::probe::Hint;
        use std::fs::File;
        use std::path::PathBuf;

        let path = PathBuf::from(path);
        let file = File::open(&path).ok()?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());
        
        let mut hint = Hint::new();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }
        
        let format_opts = FormatOptions::default();
        let metadata_opts = MetadataOptions::default();
        
        let probed = symphonia::default::get_probe().format(&hint, mss, &format_opts, &metadata_opts).ok()?;
        let format_reader = probed.format;
        
        let track = format_reader.tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)?;
        
        let codec_params = &track.codec_params;
        
        codec_params.time_base.and_then(|tb| {
            codec_params.n_frames.map(|frames| {
                frames as f64 * tb.numer as f64 / tb.denom as f64
            })
        })
    }

    /// 检查是否是不支持的格式
    fn is_unsupported_format(ext: &str) -> bool {
        matches!(
            ext,
            "ape" | "wv" | "wvc" | "wma" | "tta" | "kgm" | "mflac" | "mgg" | "vpr" | "kwm" | "ncm" | "qmc" | "qmc0" | "qmc3"
        )
    }

    /// 处理不支持的格式文件（自动隐藏）
    async fn process_unsupported_file(&self, path: &Path, ext: &str, _is_encrypted: bool) -> Option<Song> {
        let path_str = path.to_string_lossy().to_string();
        
        let filename = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();
        
        let format_note = match ext {
            "ncm" => "网易云加密格式",
            "qmc" | "qmc0" | "qmc3" => "QQ音乐加密格式",
            "ape" => "APE格式",
            "wv" | "wvc" => "WavPack格式",
            "wma" => "WMA格式",
            "tta" => "TTA格式",
            "kgm" => "酷狗加密格式",
            "mflac" => "QQ音乐无损加密",
            "mgg" => "QQ音乐加密",
            "vpr" => "酷狗加密",
            "kwm" => "酷我加密",
            _ => "不支持",
        };

        let song = Song {
            id: Uuid::new_v4().to_string(),
            title: format!("{} [{}]", filename, format_note),
            artist: "无法播放".to_string(),
            album: "不支持的格式".to_string(),
            duration: 0.0,
            path: path_str,
            cover: None,
            play_count: 0,
            created_at: Utc::now(),
            is_liked: None,
        };

        Some(song)
    }
}
