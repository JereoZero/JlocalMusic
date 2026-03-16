use tauri::State;

use crate::database::Database;
use crate::database::Song;
use super::common::ApiResponse;

#[tauri::command]
pub async fn hide_song(
    db: State<'_, Database>,
    path: String,
    is_auto: Option<bool>,
) -> Result<ApiResponse<()>, String> {
    match db.hide_song(&path, is_auto.unwrap_or(false)).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn unhide_song(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<()>, String> {
    match db.unhide_song(&path).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_hidden_paths(db: State<'_, Database>) -> Result<ApiResponse<Vec<String>>, String> {
    match db.get_hidden_paths().await {
        Ok(paths) => Ok(ApiResponse::ok(paths)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_hidden_songs(db: State<'_, Database>) -> Result<ApiResponse<Vec<Song>>, String> {
    match db.get_hidden_songs().await {
        Ok(songs) => Ok(ApiResponse::ok(songs)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn hide_songs_batch(
    db: State<'_, Database>,
    paths: Vec<String>,
    is_auto: Option<bool>,
) -> Result<ApiResponse<usize>, String> {
    match db.hide_songs_batch(paths, is_auto.unwrap_or(false)).await {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn unhide_songs_batch(
    db: State<'_, Database>,
    paths: Vec<String>,
) -> Result<ApiResponse<usize>, String> {
    match db.unhide_songs_batch(paths).await {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn clear_hidden_songs(db: State<'_, Database>) -> Result<ApiResponse<usize>, String> {
    match db.clear_hidden_songs().await {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_hidden_count(db: State<'_, Database>) -> Result<ApiResponse<i64>, String> {
    match db.get_hidden_count().await {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn is_song_hidden(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<bool>, String> {
    match db.is_song_hidden(&path).await {
        Ok(hidden) => Ok(ApiResponse::ok(hidden)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}
