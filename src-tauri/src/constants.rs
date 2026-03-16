// 音频格式配置
pub const NORMAL_AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "ogg", "m4a", "aac", "wma", "ape", 
    "alac", "dsd", "dsf", "dff"
];

pub const ENCRYPTED_AUDIO_EXTENSIONS: &[&str] = &[
    "ncm", "qmc", "qmc0", "qmc3", "qmcflac", "qmcogg", "mflac"
];

pub fn is_audio_extension(ext: &str) -> bool {
    let ext_lower = ext.to_lowercase();
    NORMAL_AUDIO_EXTENSIONS.contains(&ext_lower.as_str()) 
        || ENCRYPTED_AUDIO_EXTENSIONS.contains(&ext_lower.as_str())
}

pub fn is_encrypted_extension(ext: &str) -> bool {
    ENCRYPTED_AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str())
}

// 播放器配置
#[allow(dead_code)]
pub const DEFAULT_VOLUME: f32 = 0.8;
#[allow(dead_code)]
pub const PROGRESS_EMIT_INTERVAL_MS: u64 = 250;

// 数据库配置
#[allow(dead_code)]
pub const MAX_DB_CONNECTIONS: u32 = 10;
