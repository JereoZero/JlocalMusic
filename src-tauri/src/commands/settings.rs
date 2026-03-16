use tauri::State;

use crate::database::Database;
use super::common::ApiResponse;

#[tauri::command]
pub async fn get_setting(
    db: State<'_, Database>,
    key: String,
) -> Result<ApiResponse<Option<String>>, String> {
    match db.get_setting(&key).await {
        Ok(value) => Ok(ApiResponse::ok(value)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn set_setting(
    db: State<'_, Database>,
    key: String,
    value: String,
) -> Result<ApiResponse<()>, String> {
    match db.set_setting(&key, &value).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_all_settings(
    db: State<'_, Database>,
) -> Result<ApiResponse<Vec<(String, String)>>, String> {
    match db.get_all_settings().await {
        Ok(settings) => Ok(ApiResponse::ok(settings)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

fn is_path_in_music_folder(path: &str, music_folder: &str) -> bool {
    let path = match std::path::Path::new(path).canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };
    let music_path = match std::path::Path::new(music_folder).canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };
    path.starts_with(&music_path)
}

#[tauri::command]
pub async fn get_audio_file(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<String>, String> {
    use base64::{Engine as _, engine::general_purpose};
    
    let music_folder = match db.get_setting("music_folder").await {
        Ok(Some(folder)) => folder,
        Ok(None) => return Ok(ApiResponse::err("Music folder not configured")),
        Err(e) => return Ok(ApiResponse::err(e)),
    };
    
    if !is_path_in_music_folder(&path, &music_folder) {
        return Ok(ApiResponse::err("Access denied: path outside music folder"));
    }
    
    match std::fs::read(&path) {
        Ok(bytes) => {
            let base64 = general_purpose::STANDARD.encode(&bytes);
            Ok(ApiResponse::ok(base64))
        }
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn check_file_exists(path: String) -> Result<ApiResponse<bool>, String> {
    Ok(ApiResponse::ok(std::path::Path::new(&path).exists()))
}

#[tauri::command]
pub async fn is_song_liked(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<bool>, String> {
    match db.is_song_liked(&path).await {
        Ok(liked) => Ok(ApiResponse::ok(liked)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}
