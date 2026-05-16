use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: impl ToString) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error.to_string()),
        }
    }
}

#[derive(Serialize)]
pub struct ThumbnailInfo {
    pub small_count: usize,
    pub large_count: usize,
    pub size_bytes: u64,
}

pub async fn validate_path_in_music_folder(
    db: &crate::database::Database,
    path: &str,
) -> Result<String, String> {
    let music_folder = db.get_setting("music_folder").await
        .map_err(|e| e.to_string())?
        .ok_or("Music folder not configured".to_string())?;

    if !crate::path_validator::is_path_in_music_folder(path, &music_folder) {
        return Err("Access denied: path outside music folder".to_string());
    }

    Ok(music_folder)
}

pub const MAX_BATCH_SIZE: usize = 100;

pub const ALLOWED_SETTING_KEYS: &[&str] = &[
    "music_folder",
    "secondary_folders",
    "theme",
    "language",
    "volume",
    "last_scan",
];

pub async fn get_or_create_thumbnail(
    db: &crate::database::Database,
    path: &str,
    size: u32,
) -> Result<Option<String>, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    
    if crate::thumbnail::thumbnail_exists(path, size) {
        return Ok(crate::thumbnail::get_thumbnail_base64(path, size));
    }

    match db.get_song_cover(path).await {
        Ok(Some(cover)) => {
            match STANDARD.decode(&cover) {
                Ok(decoded) => {
                    match crate::thumbnail::create_thumbnail(&decoded, path, size) {
                        Ok(thumbnail) => Ok(Some(thumbnail)),
                        Err(_) => Ok(Some(cover)),
                    }
                }
                Err(_) => Ok(Some(cover)),
            }
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
