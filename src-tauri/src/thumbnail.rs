use std::path::PathBuf;
use std::fs;
use std::io::{Cursor, Write};
use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageReader;
use md5::compute;

pub const THUMBNAIL_SMALL_SIZE: u32 = 56;
pub const THUMBNAIL_LARGE_SIZE: u32 = 200;

fn get_thumbnails_dir() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.jlocal.app");
    
    let thumbnails_dir = data_dir.join("thumbnails");
    
    if !thumbnails_dir.exists() {
        let _ = fs::create_dir_all(&thumbnails_dir);
    }
    
    thumbnails_dir
}

fn path_to_hash(path: &str) -> String {
    let digest = compute(path.as_bytes());
    format!("{:x}", digest)
}

pub fn get_thumbnail_path(song_path: &str, size: u32) -> PathBuf {
    let hash = path_to_hash(song_path);
    get_thumbnails_dir().join(format!("{}_{}.jpg", hash, size))
}

pub fn thumbnail_exists(song_path: &str, size: u32) -> bool {
    get_thumbnail_path(song_path, size).exists()
}

pub fn get_thumbnail_base64(song_path: &str, size: u32) -> Option<String> {
    let thumbnail_path = get_thumbnail_path(song_path, size);
    
    if thumbnail_path.exists() {
        let bytes = fs::read(&thumbnail_path).ok()?;
        Some(STANDARD.encode(&bytes))
    } else {
        None
    }
}

pub fn create_thumbnail(cover_data: &[u8], song_path: &str, size: u32) -> Result<String, String> {
    let img = ImageReader::new(Cursor::new(cover_data))
        .with_guessed_format()
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let thumbnail = img.resize_to_fill(
        size,
        size,
        image::imageops::FilterType::Lanczos3,
    );

    let thumbnail_path = get_thumbnail_path(song_path, size);
    
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    
    thumbnail
        .write_to(&mut cursor, image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;

    let mut file = fs::File::create(&thumbnail_path)
        .map_err(|e| format!("Failed to create thumbnail file: {}", e))?;
    
    file.write_all(&buffer)
        .map_err(|e| format!("Failed to write thumbnail: {}", e))?;

    Ok(STANDARD.encode(&buffer))
}

#[allow(dead_code)]
pub fn get_or_create_thumbnail(cover_data: &[u8], song_path: &str, size: u32) -> Result<String, String> {
    if let Some(cached) = get_thumbnail_base64(song_path, size) {
        return Ok(cached);
    }
    
    create_thumbnail(cover_data, song_path, size)
}

pub fn get_thumbnails_count() -> (usize, usize) {
    let thumbnails_dir = get_thumbnails_dir();
    let mut small_count = 0;
    let mut large_count = 0;
    
    if thumbnails_dir.exists() {
        if let Ok(entries) = fs::read_dir(&thumbnails_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(&format!("_{}.jpg", THUMBNAIL_SMALL_SIZE)) {
                    small_count += 1;
                } else if name.ends_with(&format!("_{}.jpg", THUMBNAIL_LARGE_SIZE)) {
                    large_count += 1;
                }
            }
        }
    }
    
    (small_count, large_count)
}

pub fn get_thumbnails_size() -> u64 {
    let thumbnails_dir = get_thumbnails_dir();
    let mut total_size = 0;
    
    if thumbnails_dir.exists() {
        if let Ok(entries) = fs::read_dir(&thumbnails_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().map_or(false, |ext| ext == "jpg") {
                    if let Ok(metadata) = entry.metadata() {
                        total_size += metadata.len();
                    }
                }
            }
        }
    }
    
    total_size
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_to_hash() {
        let hash1 = path_to_hash("/music/song1.mp3");
        let hash2 = path_to_hash("/music/song2.mp3");
        
        assert_ne!(hash1, hash2);
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_get_thumbnail_path() {
        let path_small = get_thumbnail_path("/music/test.mp3", THUMBNAIL_SMALL_SIZE);
        let path_large = get_thumbnail_path("/music/test.mp3", THUMBNAIL_LARGE_SIZE);
        
        assert!(path_small.to_str().unwrap().ends_with(&format!("_{}.jpg", THUMBNAIL_SMALL_SIZE)));
        assert!(path_large.to_str().unwrap().ends_with(&format!("_{}.jpg", THUMBNAIL_LARGE_SIZE)));
    }
}
