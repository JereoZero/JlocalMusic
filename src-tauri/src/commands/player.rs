use tauri::State;

use crate::database::Database;
use crate::database::Song;
use crate::player::AudioPlayer;
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

    match player.play(&path).await {
        Ok(_) => {
            let _ = db.increment_play_count(&path).await;
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
pub async fn play_next(
    db: State<'_, Database>,
    player: State<'_, AudioPlayer>,
    current_path: String,
    mode: String,
) -> Result<ApiResponse<Song>, String> {
    match db.get_next_song(&current_path, &mode).await {
        Ok(Some(song)) => {
            if let Err(e) = player.play(&song.path).await {
                return Ok(ApiResponse::err(e.to_string()));
            }
            let _ = db.increment_play_count(&song.path).await;
            Ok(ApiResponse::ok(song))
        }
        Ok(None) => Ok(ApiResponse::err("没有更多歌曲")),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn play_prev(
    db: State<'_, Database>,
    player: State<'_, AudioPlayer>,
    current_path: String,
    mode: String,
) -> Result<ApiResponse<Song>, String> {
    match db.get_prev_song(&current_path, &mode).await {
        Ok(Some(song)) => {
            if let Err(e) = player.play(&song.path).await {
                return Ok(ApiResponse::err(e.to_string()));
            }
            let _ = db.increment_play_count(&song.path).await;
            Ok(ApiResponse::ok(song))
        }
        Ok(None) => Ok(ApiResponse::err("没有更多歌曲")),
        Err(e) => Ok(ApiResponse::err(e)),
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
pub async fn get_metadata(path: String) -> Result<ApiResponse<crate::metadata::Metadata>, String> {
    let extractor = MetadataExtractor::new();
    
    match extractor.extract(&path).await {
        Ok(metadata) => Ok(ApiResponse::ok(metadata)),
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn get_metadata_batch(
    paths: Vec<String>,
) -> Result<ApiResponse<Vec<(String, crate::metadata::Metadata)>>, String> {
    let extractor = MetadataExtractor::new();
    let mut results = Vec::new();
    
    for path in paths {
        match extractor.extract(&path).await {
            Ok(metadata) => results.push((path, metadata)),
            Err(_) => continue,
        }
    }
    
    Ok(ApiResponse::ok(results))
}
