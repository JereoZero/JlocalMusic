use std::path::Path;
use crate::constants::{is_audio_extension, NORMAL_AUDIO_EXTENSIONS, ENCRYPTED_AUDIO_EXTENSIONS};

pub fn is_path_in_music_folder(path_str: &str, music_folder: &str) -> bool {
    let path = Path::new(path_str);
    let music_path = match Path::new(music_folder).canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };

    if let Ok(canon) = path.canonicalize() {
        return canon.starts_with(&music_path);
    }

    let parent = path.parent().unwrap_or(Path::new("."));
    match parent.canonicalize() {
        Ok(parent_canon) => {
            if let Some(filename) = path.file_name() {
                parent_canon.join(filename).starts_with(&music_path)
            } else {
                parent_canon.starts_with(&music_path)
            }
        }
        Err(_) => false,
    }
}

pub fn validate_audio_extension(path: &str) -> bool {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());
    
    match ext.as_deref() {
        Some(ext) => is_audio_extension(ext),
        None => false,
    }
}

#[allow(dead_code)]
pub fn get_all_supported_extensions() -> Vec<&'static str> {
    let mut extensions: Vec<&'static str> = NORMAL_AUDIO_EXTENSIONS.to_vec();
    extensions.extend_from_slice(ENCRYPTED_AUDIO_EXTENSIONS);
    extensions
}

#[allow(dead_code)]
pub fn get_format_description(ext: &str) -> Option<&'static str> {
    match ext.to_lowercase().as_str() {
        "ncm" => Some("网易云音乐加密格式"),
        "qmc" | "qmc0" | "qmc3" | "qmcflac" | "qmcogg" | "mflac" => Some("QQ音乐加密格式"),
        _ => None,
    }
}