use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use tauri::AppHandle;
use ts_rs::TS;
use tracing::{error, info};

/// 歌曲数据结构
#[derive(Debug, Clone, Serialize, sqlx::FromRow, TS)]
#[ts(export)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub path: String,
    pub cover: Option<String>,
    pub play_count: i32,
    pub created_at: DateTime<Utc>,
    #[sqlx(default)]
    pub is_liked: Option<bool>,
}

/// 数据库错误类型
#[derive(thiserror::Error, Debug)]
pub enum DatabaseError {
    #[error("SQL 错误: {0}")]
    Sql(#[from] sqlx::Error),
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("迁移错误: {0}")]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error("歌曲不存在: {0}")]
    SongNotFound(String),
}

/// 数据库管理器
#[derive(Clone)]
pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    /// 初始化数据库
    pub async fn init(app_handle: &AppHandle) -> Result<Self, DatabaseError> {
        // 使用应用数据目录
        let db_path = crate::paths::ensure_database_dir_exists(app_handle)
            .map_err(|e| DatabaseError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                e
            )))?;
        
        info!("Initializing database at: {:?}", db_path);

        // 创建连接字符串
        let db_url = format!("sqlite:{}?mode=rwc", db_path.to_string_lossy());
        info!("Database URL: {}", db_url);

        // 创建连接池
        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .min_connections(2)
            .connect(&db_url)
            .await?;

        // 运行迁移
        info!("Running database migrations...");
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        info!("Database initialized successfully");

        Ok(Self { pool })
    }

    /// 获取所有歌曲（不含封面）
    pub async fn get_songs(&self) -> Result<Vec<Song>, DatabaseError> {
        let songs = sqlx::query_as::<_, Song>(
            r#"
            SELECT 
                s.id,
                s.title,
                s.artist,
                s.album,
                s.duration,
                s.path,
                NULL as cover,
                s.play_count,
                s.created_at,
                CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
            FROM songs s
            LEFT JOIN liked_songs l ON s.path = l.path
            ORDER BY s.created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(songs)
    }

    /// 获取歌曲封面
    pub async fn get_song_cover(&self, path: &str) -> Result<Option<String>, DatabaseError> {
        let cover: Option<String> = sqlx::query_scalar(
            "SELECT cover FROM songs WHERE path = ?"
        )
        .bind(path)
        .fetch_optional(&self.pool)
        .await?;

        Ok(cover)
    }

    /// 更新歌曲封面
    pub async fn update_song_cover(&self, path: &str, cover: &str) -> Result<(), DatabaseError> {
        sqlx::query(
            "UPDATE songs SET cover = ? WHERE path = ?"
        )
        .bind(cover)
        .bind(path)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 获取喜欢的歌曲路径
    pub async fn get_liked_paths(&self) -> Result<Vec<String>, DatabaseError> {
        let paths = sqlx::query_scalar::<_, String>("SELECT path FROM liked_songs")
            .fetch_all(&self.pool)
            .await?;

        Ok(paths)
    }

    /// 切换喜欢状态
    pub async fn toggle_like(&self, path: &str, liked: bool) -> Result<(), DatabaseError> {
        if liked {
            sqlx::query(
                r#"
                INSERT OR IGNORE INTO liked_songs (path) 
                VALUES (?)
                "#,
            )
            .bind(path)
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query("DELETE FROM liked_songs WHERE path = ?")
                .bind(path)
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }

    /// 插入或更新歌曲（使用事务批量处理）
    pub async fn upsert_songs(&self, songs: Vec<Song>) -> Result<usize, DatabaseError> {
        if songs.is_empty() {
            return Ok(0);
        }

        let mut tx = self.pool.begin().await?;
        let mut count = 0;

        for song in songs {
            let result = sqlx::query(
                r#"
                INSERT INTO songs (id, title, artist, album, duration, path, cover)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ON CONFLICT(path) DO UPDATE SET
                    title = excluded.title,
                    artist = excluded.artist,
                    album = excluded.album,
                    duration = excluded.duration,
                    cover = excluded.cover
                "#,
            )
            .bind(&song.id)
            .bind(&song.title)
            .bind(&song.artist)
            .bind(&song.album)
            .bind(song.duration)
            .bind(&song.path)
            .bind(&song.cover)
            .execute(&mut *tx)
            .await;

            match result {
                Ok(_) => count += 1,
                Err(e) => {
                    error!("Failed to insert song {}: {}", song.path, e);
                }
            }
        }

        tx.commit().await?;
        info!("Inserted/Updated {} songs", count);

        Ok(count)
    }

    /// 获取下一首歌曲
    /// 注：当前前端使用自己的队列管理，此函数保留用于未来可能的服务端播放模式
    #[allow(dead_code)]
    pub async fn get_next_song(
        &self,
        current_path: &str,
        mode: &str,
    ) -> Result<Option<Song>, DatabaseError> {
        let song = match mode {
            "random" => {
                sqlx::query_as::<_, Song>(
                    r#"
                    SELECT 
                        s.*,
                        CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
                    FROM songs s
                    LEFT JOIN liked_songs l ON s.path = l.path
                    ORDER BY RANDOM()
                    LIMIT 1
                    "#,
                )
                .fetch_optional(&self.pool)
                .await?
            }
            _ => {
                sqlx::query_as::<_, Song>(
                    r#"
                    SELECT 
                        s.*,
                        CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
                    FROM songs s
                    LEFT JOIN liked_songs l ON s.path = l.path
                    WHERE s.created_at > (SELECT created_at FROM songs WHERE path = ?)
                    ORDER BY s.created_at ASC
                    LIMIT 1
                    "#,
                )
                .bind(current_path)
                .fetch_optional(&self.pool)
                .await?
            }
        };

        Ok(song)
    }

    /// 获取上一首歌曲
    /// 注：当前前端使用自己的队列管理，此函数保留用于未来可能的服务端播放模式
    #[allow(dead_code)]
    pub async fn get_prev_song(
        &self,
        current_path: &str,
        mode: &str,
    ) -> Result<Option<Song>, DatabaseError> {
        let song = match mode {
            "random" => {
                sqlx::query_as::<_, Song>(
                    r#"
                    SELECT 
                        s.*,
                        CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
                    FROM songs s
                    LEFT JOIN liked_songs l ON s.path = l.path
                    ORDER BY RANDOM()
                    LIMIT 1
                    "#,
                )
                .fetch_optional(&self.pool)
                .await?
            }
            _ => {
                sqlx::query_as::<_, Song>(
                    r#"
                    SELECT 
                        s.*,
                        CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
                    FROM songs s
                    LEFT JOIN liked_songs l ON s.path = l.path
                    WHERE s.created_at < (SELECT created_at FROM songs WHERE path = ?)
                    ORDER BY s.created_at DESC
                    LIMIT 1
                    "#,
                )
                .bind(current_path)
                .fetch_optional(&self.pool)
                .await?
            }
        };

        Ok(song)
    }

    /// 增加播放次数
    pub async fn increment_play_count(&self, path: &str) -> Result<(), DatabaseError> {
        sqlx::query("UPDATE songs SET play_count = play_count + 1 WHERE path = ?")
            .bind(path)
            .execute(&self.pool)
            .await?;

        // 更新播放次数统计表
        sqlx::query(
            r#"
            INSERT INTO play_counts (path, count, last_played) 
            VALUES (?1, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(path) DO UPDATE SET 
                count = count + 1,
                last_played = CURRENT_TIMESTAMP
            "#
        )
        .bind(path)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 记录完整的播放历史
    pub async fn add_play_history(
        &self,
        path: &str,
        duration: i64,
        completed: bool,
    ) -> Result<(), DatabaseError> {
        sqlx::query(
            "INSERT INTO play_history (path, duration, completed) VALUES (?1, ?2, ?3)"
        )
        .bind(path)
        .bind(duration)
        .bind(if completed { 1 } else { 0 })
        .execute(&self.pool)
        .await?;

        info!(
            "Recorded play history: {} duration={}s completed={}",
            path, duration, completed
        );

        Ok(())
    }

    /// 获取播放次数统计
    pub async fn get_play_counts(&self) -> Result<Vec<(String, i64)>, DatabaseError> {
        let counts = sqlx::query_as::<_, (String, i64)>(
            "SELECT path, count FROM play_counts ORDER BY count DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(counts)
    }

    /// 获取歌曲的播放次数
    pub async fn get_song_play_count(&self, path: &str) -> Result<i64, DatabaseError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COALESCE(count, 0) FROM play_counts WHERE path = ?"
        )
        .bind(path)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        Ok(count)
    }

    /// 获取播放历史
    pub async fn get_play_history(
        &self,
        limit: Option<i64>,
    ) -> Result<Vec<PlayHistory>, DatabaseError> {
        let limit = limit.unwrap_or(100);

        let history = sqlx::query_as::<_, PlayHistory>(
            r#"
            SELECT 
                h.*,
                s.title,
                s.artist,
                s.album
            FROM play_history h
            JOIN songs s ON h.path = s.path
            ORDER BY h.played_at DESC
            LIMIT ?
            "#
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(history)
    }

    /// 清空播放历史
    pub async fn clear_play_history(&self) -> Result<(), DatabaseError> {
        sqlx::query("DELETE FROM play_history")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 清理不存在的歌曲
    pub async fn cleanup_nonexistent_songs(&self, base_folder: &str) -> Result<usize, DatabaseError> {
        // 获取所有歌曲
        let songs = self.get_songs().await?;
        let mut removed_count = 0;

        for song in songs {
            // 只检查在指定文件夹中的歌曲
            if song.path.starts_with(base_folder) && !std::path::Path::new(&song.path).exists() {
                info!("Removing non-existent song from database: {}", song.path);
                match self.delete_song(&song.path).await {
                    Ok(_) => removed_count += 1,
                    Err(e) => error!("Failed to delete song {}: {}", song.path, e),
                }
            }
        }

        info!("Cleanup complete: removed {} non-existent songs", removed_count);
        Ok(removed_count)
    }

    /// 删除歌曲
    pub async fn delete_song(&self, path: &str) -> Result<(), DatabaseError> {
        let result = sqlx::query("DELETE FROM songs WHERE path = ?")
            .bind(path)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::SongNotFound(path.to_string()));
        }

        Ok(())
    }

    /// 搜索歌曲
    pub async fn search_songs(&self, query: &str) -> Result<Vec<Song>, DatabaseError> {
        let escaped = query
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let pattern = format!("%{}%", escaped);

        let songs = sqlx::query_as::<_, Song>(
            r#"
            SELECT 
                s.*,
                CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
            FROM songs s
            LEFT JOIN liked_songs l ON s.path = l.path
            WHERE s.title LIKE ?1 ESCAPE '\' OR s.artist LIKE ?1 ESCAPE '\' OR s.album LIKE ?1 ESCAPE '\'
            ORDER BY s.title
            "#,
        )
        .bind(&pattern)
        .fetch_all(&self.pool)
        .await?;

        Ok(songs)
    }

    // ==================== 隐藏歌曲管理 ====================

    /// 隐藏歌曲
    pub async fn hide_song(&self, path: &str, is_auto: bool) -> Result<(), DatabaseError> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO hidden_songs (path, is_auto_hidden) 
            VALUES (?1, ?2)
            "#,
        )
        .bind(path)
        .bind(if is_auto { 1 } else { 0 })
        .execute(&self.pool)
        .await?;

        info!("Song hidden: {} (auto: {})", path, is_auto);
        Ok(())
    }

    /// 取消隐藏歌曲
    pub async fn unhide_song(&self, path: &str) -> Result<(), DatabaseError> {
        sqlx::query("DELETE FROM hidden_songs WHERE path = ?")
            .bind(path)
            .execute(&self.pool)
            .await?;

        info!("Song unhidden: {}", path);
        Ok(())
    }

    /// 检查歌曲是否被隐藏
    pub async fn is_song_hidden(&self, path: &str) -> Result<bool, DatabaseError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM hidden_songs WHERE path = ?")
            .bind(path)
            .fetch_one(&self.pool)
            .await?;

        Ok(count > 0)
    }

    /// 获取所有隐藏的歌曲路径
    pub async fn get_hidden_paths(&self) -> Result<Vec<String>, DatabaseError> {
        let paths = sqlx::query_scalar::<_, String>(
            "SELECT path FROM hidden_songs ORDER BY hidden_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(paths)
    }

    /// 批量隐藏歌曲
    pub async fn hide_songs_batch(&self, paths: Vec<String>, is_auto: bool) -> Result<usize, DatabaseError> {
        let mut tx = self.pool.begin().await?;
        let mut count = 0;

        for path in paths {
            match sqlx::query(
                "INSERT OR IGNORE INTO hidden_songs (path, is_auto_hidden) VALUES (?1, ?2)"
            )
            .bind(&path)
            .bind(if is_auto { 1 } else { 0 })
            .execute(&mut *tx)
            .await
            {
                Ok(result) => {
                    if result.rows_affected() > 0 {
                        count += 1;
                    }
                }
                Err(e) => {
                    error!("Failed to hide song {}: {}", path, e);
                }
            }
        }

        tx.commit().await?;
        info!("Batch hidden {} songs", count);
        Ok(count)
    }

    /// 批量取消隐藏
    pub async fn unhide_songs_batch(&self, paths: Vec<String>) -> Result<usize, DatabaseError> {
        let mut tx = self.pool.begin().await?;
        let mut count = 0;

        for path in paths {
            match sqlx::query("DELETE FROM hidden_songs WHERE path = ?")
                .bind(&path)
                .execute(&mut *tx)
                .await
            {
                Ok(result) => {
                    count += result.rows_affected() as usize;
                }
                Err(e) => {
                    error!("Failed to unhide song {}: {}", path, e);
                }
            }
        }

        tx.commit().await?;
        info!("Batch unhidden {} songs", count);
        Ok(count)
    }

    /// 清空隐藏列表
    pub async fn clear_hidden_songs(&self) -> Result<usize, DatabaseError> {
        let result = sqlx::query("DELETE FROM hidden_songs")
            .execute(&self.pool)
            .await?;

        let count = result.rows_affected() as usize;
        info!("Cleared {} hidden songs", count);
        Ok(count)
    }

    /// 获取隐藏歌曲数量
    pub async fn get_hidden_count(&self) -> Result<i64, DatabaseError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM hidden_songs")
            .fetch_one(&self.pool)
            .await?;

        Ok(count)
    }

    // ==================== 设置管理 ====================

    /// 获取设置
    pub async fn get_setting(&self, key: &str) -> Result<Option<String>, DatabaseError> {
        let value: Option<String> = sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await?;

        Ok(value)
    }

    /// 保存设置
    pub async fn set_setting(&self, key: &str, value: &str) -> Result<(), DatabaseError> {
        sqlx::query(
            r#"
            INSERT INTO settings (key, value) 
            VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET 
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(key)
        .bind(value)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 获取所有设置
    pub async fn get_all_settings(&self) -> Result<Vec<(String, String)>, DatabaseError> {
        let settings = sqlx::query_as::<_, (String, String)>(
            "SELECT key, value FROM settings"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(settings)
    }

    // ==================== 喜欢歌曲管理 ====================

    /// 检查歌曲是否已喜欢
    pub async fn is_song_liked(&self, path: &str) -> Result<bool, DatabaseError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_songs WHERE path = ?")
            .bind(path)
            .fetch_one(&self.pool)
            .await?;

        Ok(count > 0)
    }

    /// 获取隐藏的完整歌曲信息
    pub async fn get_hidden_songs(&self) -> Result<Vec<Song>, DatabaseError> {
        let songs = sqlx::query_as::<_, Song>(
            r#"
            SELECT 
                s.*,
                CASE WHEN l.path IS NOT NULL THEN 1 ELSE 0 END as is_liked
            FROM songs s
            INNER JOIN hidden_songs h ON s.path = h.path
            LEFT JOIN liked_songs l ON s.path = l.path
            ORDER BY h.hidden_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(songs)
    }

    // ==================== 日志管理 ====================

    /// 添加日志
    pub async fn add_log(&self, level: &str, message: &str, target: Option<&str>) -> Result<(), DatabaseError> {
        sqlx::query(
            "INSERT INTO app_logs (level, message, target) VALUES (?1, ?2, ?3)"
        )
        .bind(level)
        .bind(message)
        .bind(target)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 获取日志
    pub async fn get_logs(&self, level: Option<&str>, limit: Option<i64>) -> Result<Vec<AppLog>, DatabaseError> {
        let limit = limit.unwrap_or(100);

        let logs = if let Some(level) = level {
            sqlx::query_as::<_, AppLog>(
                "SELECT * FROM app_logs WHERE level = ?1 ORDER BY created_at DESC LIMIT ?2"
            )
            .bind(level)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, AppLog>(
                "SELECT * FROM app_logs ORDER BY created_at DESC LIMIT ?1"
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(logs)
    }

    /// 获取错误日志
    pub async fn get_error_logs(&self) -> Result<Vec<AppLog>, DatabaseError> {
        self.get_logs(Some("ERROR"), None).await
    }

    /// 清空日志
    pub async fn clear_logs(&self) -> Result<usize, DatabaseError> {
        let result = sqlx::query("DELETE FROM app_logs")
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() as usize)
    }

    /// 获取日志数量
    pub async fn get_log_count(&self) -> Result<i64, DatabaseError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM app_logs")
            .fetch_one(&self.pool)
            .await?;

        Ok(count)
    }
}

/// 日志数据结构
#[derive(Debug, Clone, Serialize, sqlx::FromRow, TS)]
#[ts(export)]
pub struct AppLog {
    pub id: i64,
    pub level: String,
    pub message: String,
    pub target: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 播放历史数据结构
#[derive(Debug, Clone, Serialize, sqlx::FromRow, TS)]
#[ts(export)]
pub struct PlayHistory {
    pub id: i64,
    pub path: String,
    pub played_at: DateTime<Utc>,
    pub duration: Option<i64>,
    pub completed: Option<i32>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
}

/// 初始化数据库（供 main.rs 调用）
pub async fn init(app_handle: &AppHandle) -> Result<Database, DatabaseError> {
    Database::init(app_handle).await
}
