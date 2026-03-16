use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use serde::Serialize;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};
use ts_rs::TS;

/// 音频元数据
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Metadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: f64,
    pub bitrate: Option<u32>,
    pub sample_rate: Option<u32>,
    pub channels: Option<u8>,
    pub cover: Option<String>, // base64 encoded cover image
}

/// 元数据提取器
pub struct MetadataExtractor;

impl MetadataExtractor {
    pub fn new() -> Self {
        Self
    }

    /// 提取音频文件元数据
    pub async fn extract(&self, path: &str) -> anyhow::Result<Metadata> {
        let path = Path::new(path);
        
        // 使用 lofty 读取元数据
        let tagged_file = Probe::open(path)?.read()?;
        let properties = tagged_file.properties();
        
        let duration = properties.duration().as_secs_f64();
        let bitrate = properties.audio_bitrate();
        let sample_rate = properties.sample_rate();
        let channels = properties.channels();

        // 尝试获取标签 - 使用 Accessor trait
        let (title, artist, album) = if let Some(tag) = tagged_file.primary_tag() {
            (
                tag.title().map(|s| s.to_string()),
                tag.artist().map(|s| s.to_string()),
                tag.album().map(|s| s.to_string()),
            )
        } else {
            (None, None, None)
        };

        // 提取封面图片
        let cover = self.extract_cover(&tagged_file);

        Ok(Metadata {
            title,
            artist,
            album,
            duration,
            bitrate,
            sample_rate,
            channels,
            cover,
        })
    }

    /// 提取封面图片
    fn extract_cover(&self, tagged_file: &lofty::file::TaggedFile) -> Option<String> {
        // 尝试从主标签获取图片
        if let Some(tag) = tagged_file.primary_tag() {
            if let Some(picture) = tag.pictures().first() {
                return Some(general_purpose::STANDARD.encode(picture.data()));
            }
        }

        // 尝试从所有标签获取图片
        for tag in tagged_file.tags() {
            if let Some(picture) = tag.pictures().first() {
                return Some(general_purpose::STANDARD.encode(picture.data()));
            }
        }

        None
    }
}
