use tauri::AppHandle;
use tauri::Manager;
use super::common::ApiResponse;

#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Result<ApiResponse<Option<String>>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let folder_path: Option<tauri_plugin_dialog::FilePath> = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("选择音乐文件夹")
            .blocking_pick_folder()
    }).await.map_err(|e| e.to_string())?;
    
    let result = folder_path.map(|p| match p {
        tauri_plugin_dialog::FilePath::Path(path_buf) => path_buf.to_string_lossy().to_string(),
        tauri_plugin_dialog::FilePath::Url(url) => url
            .to_file_path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| url.to_string()),
    });
    
    Ok(ApiResponse::ok(result))
}

#[tauri::command]
pub fn get_lyrics(path: String) -> Result<ApiResponse<Option<crate::lyrics::LyricSource>>, String> {
    use std::path::Path;
    
    let audio_path = Path::new(&path);
    
    match crate::lyrics::get_lyrics(audio_path) {
        Some(lyrics) => Ok(ApiResponse::ok(Some(lyrics))),
        None => Ok(ApiResponse::ok(None)),
    }
}

#[tauri::command]
pub async fn get_primary_music_folder(app: AppHandle) -> Result<ApiResponse<String>, String> {
    let db = app.state::<crate::database::Database>();
    
    // 先检查用户设置的 music_folder
    if let Ok(Some(custom_folder)) = db.get_setting("music_folder").await {
        if !custom_folder.is_empty() && std::path::Path::new(&custom_folder).exists() {
            return Ok(ApiResponse::ok(custom_folder));
        }
    }
    
    // 如果没有设置或路径不存在，返回默认的 jmusic-file 目录
    let music_folder = crate::paths::ensure_music_folder_exists(&app)?;
    Ok(ApiResponse::ok(music_folder.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn add_secondary_folder(
    app: AppHandle,
    target_path: String,
) -> Result<ApiResponse<String>, String> {
    use std::os::unix::fs::symlink;
    
    let primary_folder = crate::paths::ensure_music_folder_exists(&app)?;
    
    let target_name = std::path::Path::new(&target_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("link");
    
    let mut link_name = target_name.to_string();
    let mut counter = 1;
    loop {
        let link_path = primary_folder.join(&link_name);
        if !link_path.exists() {
            break;
        }
        link_name = format!("{}_{}", target_name, counter);
        counter += 1;
    }
    
    let link_path = primary_folder.join(&link_name);
    
    #[cfg(unix)]
    {
        symlink(&target_path, &link_path)
            .map_err(|e| format!("创建符号链接失败: {}", e))?;
    }
    
    #[cfg(windows)]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "mklink", "/J", &link_path.to_string_lossy(), &target_path])
            .output()
            .map_err(|e| format!("创建 junction 失败: {}", e))?;
    }
    
    Ok(ApiResponse::ok(link_path.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn remove_secondary_folder(
    app: AppHandle,
    link_name: String,
) -> Result<ApiResponse<()>, String> {
    let primary_folder = crate::paths::get_music_folder_path(&app)?;
    let link_path = primary_folder.join(&link_name);
    
    if !link_path.exists() {
        return Ok(ApiResponse::err("指定的路径不存在"));
    }
    
    let metadata = std::fs::symlink_metadata(&link_path)
        .map_err(|e| format!("获取链接信息失败: {}", e))?;
    
    let file_type = metadata.file_type();
    
    #[cfg(unix)]
    {
        if !file_type.is_symlink() {
            return Ok(ApiResponse::err("指定的路径不是符号链接"));
        }
        std::fs::remove_file(&link_path)
            .map_err(|e| format!("删除符号链接失败: {}", e))?;
    }
    
    #[cfg(windows)]
    {
        // Windows junction 可能是目录
        if file_type.is_dir() {
            std::fs::remove_dir(&link_path)
                .map_err(|e| format!("删除 junction 失败: {}", e))?;
        } else if file_type.is_symlink() {
            std::fs::remove_file(&link_path)
                .map_err(|e| format!("删除符号链接失败: {}", e))?;
        } else {
            return Ok(ApiResponse::err("指定的路径不是符号链接或 junction"));
        }
    }
    
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub async fn get_secondary_folders(app: AppHandle) -> Result<ApiResponse<Vec<(String, String)>>, String> {
    let primary_folder = crate::paths::get_music_folder_path(&app)?;
    
    if !primary_folder.exists() {
        return Ok(ApiResponse::ok(vec![]));
    }
    
    let mut folders = Vec::new();
    
    for entry in std::fs::read_dir(&primary_folder)
        .map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        let metadata = std::fs::symlink_metadata(&path)
            .map_err(|e| e.to_string())?;
        let file_type = metadata.file_type();
        
        #[cfg(unix)]
        let is_link = file_type.is_symlink();
        
        #[cfg(windows)]
        let is_link = file_type.is_symlink() || file_type.is_dir();
        
        if is_link {
            let name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            let target = std::fs::read_link(&path)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| "unknown".to_string());
            
            folders.push((name, target));
        }
    }
    
    Ok(ApiResponse::ok(folders))
}
