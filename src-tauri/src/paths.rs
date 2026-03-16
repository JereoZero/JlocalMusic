use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))
}

pub fn get_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir(app)?;
    Ok(data_dir.join("data").join("music.db"))
}

pub fn get_music_folder_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir(app)?;
    Ok(data_dir.join("jmusic-file"))
}

pub fn ensure_database_dir_exists(app: &AppHandle) -> Result<PathBuf, String> {
    let db_path = get_database_path(app)?;
    if let Some(parent) = db_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("无法创建数据库目录: {}", e))?;
        }
    }
    Ok(db_path)
}

pub fn ensure_music_folder_exists(app: &AppHandle) -> Result<PathBuf, String> {
    let music_folder = get_music_folder_path(app)?;
    if !music_folder.exists() {
        std::fs::create_dir_all(&music_folder)
            .map_err(|e| format!("无法创建音乐文件夹: {}", e))?;
    }
    Ok(music_folder)
}
