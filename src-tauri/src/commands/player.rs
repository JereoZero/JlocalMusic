use tauri::State;

use crate::database::Database;
use crate::player::{AudioPlayer, probe_audio_file};
use crate::metadata::MetadataExtractor;
use crate::path_validator::{is_path_in_music_folder, validate_audio_extension};
use super::common::ApiResponse;

#[tauri::command]
pub async fn play_song(
    player: State<'_, AudioPlayer>,
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<()>, String> {
    // 验证文件扩展名
    if !validate_audio_extension(&path) {
        return Ok(ApiResponse::err("Invalid audio file format"));
    }

    // 验证路径是否在音乐文件夹内
    let music_folder = match db.get_setting("music_folder").await {
        Ok(Some(folder)) => folder,
        Ok(None) => return Ok(ApiResponse::err("Music folder not configured")),
        Err(e) => return Ok(ApiResponse::err(e.to_string())),
    };

    if !is_path_in_music_folder(&path, &music_folder) {
        return Ok(ApiResponse::err("Access denied: path outside music folder"));
    }

    if !std::path::Path::new(&path).exists() {
        return Ok(ApiResponse::err("File not found"));
    }

    if let Err(e) = probe_audio_file(&path) {
        return Ok(ApiResponse::err(e));
    }

    match player.play(&path).await {
        Ok(_) => {
            if let Err(e) = db.increment_play_count(&path).await {
                tracing::warn!("Failed to increment play count: {}", e);
            }
            Ok(ApiResponse::ok(()))
        }
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn pause_song(player: State<'_, AudioPlayer>) -> Result<ApiResponse<()>, String> {
    match player.pause().await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn resume_song(player: State<'_, AudioPlayer>) -> Result<ApiResponse<()>, String> {
    match player.resume().await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn stop_song(player: State<'_, AudioPlayer>) -> Result<ApiResponse<()>, String> {
    match player.stop().await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn seek_song(
    player: State<'_, AudioPlayer>,
    time: f64,
) -> Result<ApiResponse<()>, String> {
    match player.seek(time).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn set_volume(
    player: State<'_, AudioPlayer>,
    volume: f32,
) -> Result<ApiResponse<()>, String> {
    match player.set_volume(volume).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn get_player_state(
    player: State<'_, AudioPlayer>,
) -> Result<ApiResponse<crate::player::PlayerState>, String> {
    let state = player.get_state().await;
    Ok(ApiResponse::ok(state))
}

#[tauri::command]
pub async fn get_metadata(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<crate::metadata::Metadata>, String> {
    if !validate_audio_extension(&path) {
        return Ok(ApiResponse::err("Invalid audio file format"));
    }
    
    let music_folder = match db.get_setting("music_folder").await {
        Ok(Some(folder)) => folder,
        Ok(None) => return Ok(ApiResponse::err("Music folder not configured")),
        Err(e) => return Ok(ApiResponse::err(e.to_string())),
    };

    if !is_path_in_music_folder(&path, &music_folder) {
        return Ok(ApiResponse::err("Access denied: path outside music folder"));
    }

    let extractor = MetadataExtractor::new();
    
    match extractor.extract(&path).await {
        Ok(metadata) => Ok(ApiResponse::ok(metadata)),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn get_metadata_batch(
    db: State<'_, Database>,
    paths: Vec<String>,
) -> Result<ApiResponse<Vec<BatchMetadata>>, String> {
    let music_folder = match db.get_setting("music_folder").await {
        Ok(Some(folder)) => folder,
        Ok(None) => return Ok(ApiResponse::err("Music folder not configured")),
        Err(e) => return Ok(ApiResponse::err(e.to_string())),
    };

    let paths = paths.clone();
    let results = tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();
        
        for path in paths {
            if !validate_audio_extension(&path) {
                continue;
            }
            if !is_path_in_music_folder(&path, &music_folder) {
                continue;
            }
            match MetadataExtractor::extract_blocking(&path) {
                Ok(metadata) => results.push(BatchMetadata { path, metadata }),
                Err(_) => continue,
            }
        }
        
        results
    }).await.map_err(|e| e.to_string())?;
    
    Ok(ApiResponse::ok(results))
}

#[derive(serde::Serialize)]
pub struct BatchMetadata {
    pub path: String,
    pub metadata: crate::metadata::Metadata,
}
