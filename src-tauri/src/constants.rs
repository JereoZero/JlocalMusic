// 音频格式配置
pub const NORMAL_AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "ogg", "m4a", "aac",
    "alac", "dsd", "dsf", "dff", "aif", "aiff", "opus", "caf"
];

pub const ENCRYPTED_AUDIO_EXTENSIONS: &[&str] = &[
    "ncm", "qmc", "qmc0", "qmc3", "qmcflac", "qmcogg", "mflac"
];

pub const UNSUPPORTED_AUDIO_EXTENSIONS: &[&str] = &[
    "wma", "ape", "wv", "wvc", "tta"
];

pub const SYMPHONIA_EXTENSIONS: &[&str] = &[
    "flac", "dsf", "dff", "m4a", "m4b", "aac", "ogg", "opus",
    "wav", "aif", "aiff", "aifc", "caf"
];

pub fn is_audio_extension(ext: &str) -> bool {
    let ext_lower = ext.to_lowercase();
    NORMAL_AUDIO_EXTENSIONS.contains(&ext_lower.as_str()) 
        || ENCRYPTED_AUDIO_EXTENSIONS.contains(&ext_lower.as_str())
        || UNSUPPORTED_AUDIO_EXTENSIONS.contains(&ext_lower.as_str())
}

pub fn is_encrypted_extension(ext: &str) -> bool {
    ENCRYPTED_AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str())
}

pub fn is_symphonia_format(path: &str) -> bool {
    std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| {
            let lower = ext.to_lowercase();
            SYMPHONIA_EXTENSIONS.contains(&lower.as_str())
        })
        .unwrap_or(false)
}

// 播放器配置
#[allow(dead_code)]
pub const DEFAULT_VOLUME: f32 = 0.8;
#[allow(dead_code)]
pub const PROGRESS_EMIT_INTERVAL_MS: u64 = 250;

// 数据库配置
#[allow(dead_code)]
pub const MAX_DB_CONNECTIONS: u32 = 10;
