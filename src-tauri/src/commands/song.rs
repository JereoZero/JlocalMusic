use tauri::State;
use std::collections::HashMap;
use base64::Engine;

use crate::database::Database;
use crate::database::Song;
use crate::scanner::FolderScanner;
use super::common::{ApiResponse, ThumbnailInfo, get_or_create_thumbnail};

#[tauri::command]
pub async fn get_songs(db: State<'_, Database>) -> Result<ApiResponse<Vec<Song>>, String> {
    match db.get_songs().await {
        Ok(songs) => Ok(ApiResponse::ok(songs)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_song_cover(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<Option<String>>, String> {
    use crate::thumbnail::THUMBNAIL_SMALL_SIZE;
    
    match get_or_create_thumbnail(&db, &path, THUMBNAIL_SMALL_SIZE).await {
        Ok(thumbnail) => Ok(ApiResponse::ok(thumbnail)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_song_cover_large(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<Option<String>>, String> {
    use crate::thumbnail::THUMBNAIL_LARGE_SIZE;
    
    match get_or_create_thumbnail(&db, &path, THUMBNAIL_LARGE_SIZE).await {
        Ok(thumbnail) => Ok(ApiResponse::ok(thumbnail)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn get_song_cover_full(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<Option<String>>, String> {
    match db.get_song_cover(&path).await {
        Ok(Some(cover)) if !cover.is_empty() => {
            return Ok(ApiResponse::ok(Some(cover)));
        }
        Ok(_) => {
            let extractor = crate::metadata::MetadataExtractor::new();
            match extractor.extract(&path).await {
                Ok(metadata) => {
                    if let Some(cover) = metadata.cover {
                        let _ = db.update_song_cover(&path, &cover).await;
                        return Ok(ApiResponse::ok(Some(cover)));
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to extract cover: {}", e);
                }
            }
            
            if let Some(fallback_cover) = find_fallback_cover(&path).await {
                return Ok(ApiResponse::ok(Some(fallback_cover)));
            }
            
            Ok(ApiResponse::ok(None))
        }
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

async fn find_fallback_cover(song_path: &str) -> Option<String> {
    use std::path::Path;
    use tokio::fs;
    
    let song = Path::new(song_path);
    let song_dir = song.parent()?;
    
    let album_cover_names = [
        "cover", "Cover", "COVER",
        "album", "Album", "ALBUM",
        "folder", "Folder", "FOLDER",
        "front", "Front", "FRONT",
        "artwork", "Artwork", "ARTWORK",
    ];
    
    let extensions = ["jpg", "jpeg", "png", "webp", "bmp"];
    
    for name in &album_cover_names {
        for ext in &extensions {
            let cover_path = song_dir.join(format!("{}.{}", name, ext));
            if cover_path.exists() {
                if let Ok(bytes) = fs::read(&cover_path).await {
                    return Some(base64::engine::general_purpose::STANDARD.encode(&bytes));
                }
            }
        }
    }
    
    if let Some(artist_dir) = song_dir.parent() {
        for name in &album_cover_names {
            for ext in &extensions {
                let cover_path = artist_dir.join(format!("{}.{}", name, ext));
                if cover_path.exists() {
                    if let Ok(bytes) = fs::read(&cover_path).await {
                        return Some(base64::engine::general_purpose::STANDARD.encode(&bytes));
                    }
                }
            }
        }
        
        let artist_cover_names = [
            "artist", "Artist", "ARTIST",
            "band", "Band", "BAND",
            "singer", "Singer", "SINGER",
        ];
        
        for name in &artist_cover_names {
            for ext in &extensions {
                let cover_path = artist_dir.join(format!("{}.{}", name, ext));
                if cover_path.exists() {
                    if let Ok(bytes) = fs::read(&cover_path).await {
                        return Some(base64::engine::general_purpose::STANDARD.encode(&bytes));
                    }
                }
            }
        }
    }
    
    None
}

#[tauri::command]
pub async fn get_song_covers_batch(
    db: State<'_, Database>,
    paths: Vec<String>,
) -> Result<ApiResponse<HashMap<String, Option<String>>>, String> {
    use crate::thumbnail::THUMBNAIL_SMALL_SIZE;
    
    let mut result = HashMap::new();
    
    for path in &paths {
        match get_or_create_thumbnail(&db, path, THUMBNAIL_SMALL_SIZE).await {
            Ok(thumbnail) => {
                result.insert(path.clone(), thumbnail);
            }
            Err(_) => {
                result.insert(path.clone(), None);
            }
        }
    }
    
    Ok(ApiResponse::ok(result))
}

#[tauri::command]
pub fn get_thumbnail_info() -> Result<ApiResponse<ThumbnailInfo>, String> {
    let (small_count, large_count) = crate::thumbnail::get_thumbnails_count();
    Ok(ApiResponse::ok(ThumbnailInfo {
        small_count,
        large_count,
        size_bytes: crate::thumbnail::get_thumbnails_size(),
    }))
}

#[tauri::command]
pub async fn get_liked_paths(db: State<'_, Database>) -> Result<ApiResponse<Vec<String>>, String> {
    match db.get_liked_paths().await {
        Ok(paths) => Ok(ApiResponse::ok(paths)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn toggle_like(
    db: State<'_, Database>,
    path: String,
    liked: bool,
) -> Result<ApiResponse<()>, String> {
    match db.toggle_like(&path, liked).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn scan_folder(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<crate::scanner::ScanResult>, String> {
    match db.cleanup_nonexistent_songs().await {
        Ok(removed) => {
            tracing::info!("Removed {} non-existent songs", removed);
        }
        Err(e) => {
            tracing::error!("Failed to cleanup non-existent songs: {}", e);
        }
    }

    let scanner = FolderScanner::new();
    match scanner.scan(&path).await {
        Ok(result) => {
            if !result.normal_songs.is_empty() {
                let (success, errors) = db.upsert_songs(result.normal_songs.clone()).await
                    .unwrap_or((0, 0));
                if errors > 0 {
                    tracing::warn!("{} normal songs failed to insert", errors);
                }
                tracing::info!("Saved {} normal songs, {} errors", success, errors);
            }

            if !result.encrypted_songs.is_empty() {
                let (success, errors) = db.upsert_songs(result.encrypted_songs.clone()).await
                    .unwrap_or((0, 0));
                if success > 0 {
                    let encrypted_paths: Vec<String> = result
                        .encrypted_songs
                        .iter()
                        .map(|s| s.path.clone())
                        .collect();
                    if let Err(e) = db.hide_songs_batch(encrypted_paths, true).await {
                        tracing::error!("Failed to auto-hide encrypted songs: {}", e);
                    }
                }
                if errors > 0 {
                    tracing::warn!("{} encrypted songs failed to insert", errors);
                }
            }

            Ok(ApiResponse::ok(result))
        }
        Err(e) => Ok(ApiResponse::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn search_songs(
    db: State<'_, Database>,
    query: String,
) -> Result<ApiResponse<Vec<Song>>, String> {
    match db.search_songs(&query).await {
        Ok(songs) => Ok(ApiResponse::ok(songs)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn delete_song(
    db: State<'_, Database>,
    path: String,
) -> Result<ApiResponse<()>, String> {
    match db.delete_song(&path).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}
