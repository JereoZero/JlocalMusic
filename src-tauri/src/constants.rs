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
    let path_lower = path.to_lowercase();
    SYMPHONIA_EXTENSIONS.iter().any(|ext| path_lower.ends_with(ext))
}

// 播放器配置
#[allow(dead_code)]
pub const DEFAULT_VOLUME: f32 = 0.8;
#[allow(dead_code)]
pub const PROGRESS_EMIT_INTERVAL_MS: u64 = 250;

// 数据库配置
#[allow(dead_code)]
pub const MAX_DB_CONNECTIONS: u32 = 10;
