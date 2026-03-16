use std::path::Path;
use std::fs;
use lofty::probe::Probe;
use lofty::file::TaggedFileExt;
use lofty::tag::ItemKey;
use encoding_rs::{UTF_8, GBK};

#[derive(Debug, Clone, serde::Serialize)]
pub struct LyricSource {
    pub content: String,
    pub source: String,
}

fn decode_lrc_content(bytes: &[u8]) -> String {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        let (decoded, _, _) = UTF_8.decode(&bytes[3..]);
        return decoded.to_string();
    }

    if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        let (decoded, _, _) = encoding_rs::UTF_16LE.decode(bytes);
        return decoded.to_string();
    }

    let utf8_result = String::from_utf8(bytes.to_vec());
    if utf8_result.is_ok() {
        return utf8_result.unwrap();
    }

    let (decoded, _, had_errors) = GBK.decode(bytes);
    if !had_errors {
        return decoded.to_string();
    }

    String::from_utf8_lossy(bytes).to_string()
}

pub fn load_lrc_file(audio_path: &Path) -> Option<LyricSource> {
    let lrc_path = audio_path.with_extension("lrc");

    if !lrc_path.exists() {
        let alt_lrc_path = audio_path.with_extension("LRC");
        if !alt_lrc_path.exists() {
            return None;
        }
        return load_lrc_from_path(&alt_lrc_path);
    }

    load_lrc_from_path(&lrc_path)
}

fn load_lrc_from_path(lrc_path: &Path) -> Option<LyricSource> {
    let bytes = fs::read(lrc_path).ok()?;
    let content = decode_lrc_content(&bytes);

    if content.trim().is_empty() {
        return None;
    }

    Some(LyricSource {
        content,
        source: "lrc_file".to_string(),
    })
}

pub fn extract_embedded_lyrics(audio_path: &Path) -> Option<LyricSource> {
    let probe = Probe::open(audio_path).ok()?;
    let tagged_file = probe.read().ok()?;

    let tag = tagged_file.primary_tag()?;

    if let Some(lyrics_content) = tag.get_string(&ItemKey::Lyrics) {
        let content = lyrics_content.to_string();

        if !content.trim().is_empty() {
            return Some(LyricSource {
                content,
                source: "embedded".to_string(),
            });
        }
    }

    None
}

pub fn get_lyrics(audio_path: &Path) -> Option<LyricSource> {
    if let Some(lrc_lyrics) = load_lrc_file(audio_path) {
        return Some(lrc_lyrics);
    }

    extract_embedded_lyrics(audio_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_utf8_with_bom() {
        let bytes = [0xEF, 0xBB, 0xBF, b'H', b'e', b'l', b'l', b'o'];
        let decoded = decode_lrc_content(&bytes);
        assert_eq!(decoded, "Hello");
    }

    #[test]
    fn test_decode_utf8_without_bom() {
        let bytes = b"Hello World";
        let decoded = decode_lrc_content(bytes);
        assert_eq!(decoded, "Hello World");
    }

    #[test]
    fn test_decode_gbk() {
        let bytes = [0xC4, 0xE3, 0xBA, 0xC3];
        let decoded = decode_lrc_content(&bytes);
        assert_eq!(decoded, "你好");
    }

    #[test]
    fn test_decode_lrc_content() {
        let lrc = "[00:00.00]First line\n[00:05.50]Second line";
        let decoded = decode_lrc_content(lrc.as_bytes());
        assert!(decoded.contains("First line"));
        assert!(decoded.contains("Second line"));
    }
}
