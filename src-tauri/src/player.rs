use rodio::{Decoder, OutputStream, Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use std::sync::mpsc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use ts_rs::TS;
use crate::flac_decoder::SymphoniaDecoder;
use crate::constants::is_symphonia_format;

pub fn probe_audio_file(path: &str) -> Result<(), String> {
    let file = File::open(path).map_err(|e| format!("Cannot open file: {}", e))?;
    let path_lower = path.to_lowercase();

    if is_symphonia_format(&path_lower) {
        use symphonia::core::io::MediaSourceStream;
        use symphonia::core::probe::Hint;
        use symphonia::core::formats::FormatOptions;
        use symphonia::core::meta::MetadataOptions;

        let mss = MediaSourceStream::new(Box::new(file), Default::default());
        let mut hint = Hint::new();
        if let Some(ext) = Path::new(path).extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }

        let format_opts = FormatOptions::default();
        let metadata_opts = MetadataOptions::default();

        let _probed = symphonia::default::get_probe()
            .format(&hint, mss, &format_opts, &metadata_opts)
            .map_err(|e| format!("Unsupported or corrupt audio format: {}", e))?;
    } else {
        let reader = BufReader::new(file);
        let _source = Decoder::new(reader)
            .map_err(|e| format!("Cannot decode audio file: {}", e))?;
    }

    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, TS)]
#[ts(export)]
pub enum PlaybackState {
    Playing,
    Paused,
    Stopped,
}

#[derive(Debug, Clone, serde::Serialize, TS)]
#[ts(export)]
pub struct PlayerState {
    pub state: PlaybackState,
    pub current_path: Option<String>,
    pub volume: f32,
    pub position: f64,
    pub duration: Option<f64>,
}

#[derive(Debug)]
pub enum PlayerCmd {
    Play(String),
    Pause,
    Resume,
    Stop,
    Seek(f64),
    SetVolume(f32),
}

pub struct AudioPlayer {
    state: Arc<RwLock<PlayerState>>,
    cmd_tx: mpsc::Sender<PlayerCmd>,
}

impl AudioPlayer {
    pub fn new(app_handle: AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let state = Arc::new(RwLock::new(PlayerState {
            state: PlaybackState::Stopped,
            current_path: None,
            volume: 0.8,
            position: 0.0,
            duration: None,
        }));

        let (cmd_tx, cmd_rx) = mpsc::channel();

        let state_clone = state.clone();
        std::thread::spawn(move || {
            Self::player_thread(cmd_rx, state_clone, app_handle);
        });

        info!("Audio player initialized");
        Ok(Self { state, cmd_tx })
    }

    fn try_create_output_stream() -> Option<(OutputStream, rodio::OutputStreamHandle)> {
        match OutputStream::try_default() {
            Ok(pair) => Some(pair),
            Err(e) => {
                warn!("Failed to create output stream: {}", e);
                None
            }
        }
    }

    fn player_thread(
        cmd_rx: mpsc::Receiver<PlayerCmd>,
        state: Arc<RwLock<PlayerState>>,
        app_handle: AppHandle,
    ) {
        let mut output: Option<(OutputStream, rodio::OutputStreamHandle)> =
            Self::try_create_output_stream();
        let mut sink: Option<Sink> = None;
        let mut start_time: Option<Instant> = None;
        let mut base_position: f64 = 0.0;
        let mut duration: Option<f64> = None;
        let mut volume: f32 = 0.8;
        let mut last_emit = Instant::now();
        let mut has_source = false;
        let mut stream_retry_counter: u32 = 0;

        if output.is_some() {
            info!("Output stream created successfully");
        } else {
            warn!("Failed to create initial output stream, will retry...");
        }

        loop {
            match cmd_rx.recv_timeout(Duration::from_millis(100)) {
                Ok(cmd) => {
                    match cmd {
                        PlayerCmd::Play(path) => {
                            if output.is_none() {
                                output = Self::try_create_output_stream();
                            }

                            if output.is_none() {
                                error!("Cannot play: no output stream available");
                                let _ = app_handle.emit("playback_error", serde_json::json!({
                                    "error": "No audio output device available"
                                }));
                                continue;
                            }

                            if let Some(s) = sink.take() {
                                s.stop();
                            }
                            has_source = false;

                            if !Path::new(&path).exists() {
                                warn!("File not found: {}", path);
                                continue;
                            }

                            let path_lower = path.to_lowercase();
                            let use_symphonia = is_symphonia_format(&path_lower);

                            let (_, ref stream_handle) = output.as_ref().unwrap();
                            let new_sink = match Sink::try_new(stream_handle) {
                                Ok(s) => s,
                                Err(e) => {
                                    error!("Failed to create sink: {}", e);
                                    output = None;
                                    continue;
                                }
                            };

                            if use_symphonia {
                                match SymphoniaDecoder::new(&path) {
                                    Ok(source) => {
                                        duration = source.total_duration().map(|d| d.as_secs_f64());
                                        new_sink.set_volume(volume);
                                        new_sink.append(source);
                                        new_sink.play();

                                        sink = Some(new_sink);
                                        has_source = true;
                                        start_time = Some(Instant::now());
                                        base_position = 0.0;

                                        let mut s = state.blocking_write();
                                        s.state = PlaybackState::Playing;
                                        s.current_path = Some(path.clone());
                                        s.position = 0.0;
                                        s.duration = duration;

                                        info!("Playing with Symphonia: {}", path);
                                    }
                                    Err(e) => {
                                        warn!("Failed to decode with Symphonia: {}", e);
                                        continue;
                                    }
                                }
                            } else {
                                let file = match File::open(&path) {
                                    Ok(f) => f,
                                    Err(e) => {
                                        warn!("Failed to open file: {}", e);
                                        continue;
                                    }
                                };

                                let source = match Decoder::new(BufReader::new(file)) {
                                    Ok(s) => s,
                                    Err(e) => {
                                        warn!("Failed to decode with rodio: {}", e);
                                        continue;
                                    }
                                };

                                duration = source.total_duration().map(|d| d.as_secs_f64());
                                new_sink.set_volume(volume);
                                new_sink.append(source);
                                new_sink.play();

                                sink = Some(new_sink);
                                has_source = true;
                                start_time = Some(Instant::now());
                                base_position = 0.0;

                                let mut s = state.blocking_write();
                                s.state = PlaybackState::Playing;
                                s.current_path = Some(path.clone());
                                s.position = 0.0;
                                s.duration = duration;

                                info!("Playing: {}", path);
                            }

                            if let Some(d) = duration {
                                let _ = app_handle.emit("playback_progress", serde_json::json!({
                                    "position": 0.0,
                                    "duration": d
                                }));
                            }
                        }
                        PlayerCmd::Pause => {
                            if let Some(ref s) = sink {
                                s.pause();
                                if let Some(t) = start_time {
                                    base_position += t.elapsed().as_secs_f64();
                                }
                                start_time = None;

                                let mut st = state.blocking_write();
                                st.state = PlaybackState::Paused;
                                st.position = base_position;

                                info!("Paused at {:.1}s", base_position);
                            }
                        }
                        PlayerCmd::Resume => {
                            if let Some(ref s) = sink {
                                s.play();
                                start_time = Some(Instant::now());

                                let mut st = state.blocking_write();
                                st.state = PlaybackState::Playing;

                                info!("Resumed from {:.1}s", base_position);
                            }
                        }
                        PlayerCmd::Stop => {
                            if let Some(s) = sink.take() {
                                s.stop();
                            }
                            has_source = false;
                            start_time = None;
                            base_position = 0.0;

                            let mut st = state.blocking_write();
                            st.state = PlaybackState::Stopped;
                            st.current_path = None;
                            st.position = 0.0;

                            info!("Stopped");
                        }
                        PlayerCmd::Seek(time) => {
                            if let Some(ref s) = sink {
                                match s.try_seek(Duration::from_secs_f64(time)) {
                                    Ok(_) => {
                                        base_position = time;
                                        start_time = Some(Instant::now());

                                        let mut st = state.blocking_write();
                                        st.position = time;

                                        info!("Seeked to {:.1}s", time);
                                    }
                                    Err(e) => {
                                        warn!("Seek failed: {:?}", e);
                                    }
                                }
                            }
                        }
                        PlayerCmd::SetVolume(vol) => {
                            volume = vol.clamp(0.0, 1.0);
                            if let Some(ref s) = sink {
                                s.set_volume(volume);
                            }

                            let mut st = state.blocking_write();
                            st.volume = volume;
                        }
                    }
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    if output.is_none() {
                        stream_retry_counter += 1;
                        if stream_retry_counter >= 10 {
                            output = Self::try_create_output_stream();
                            if output.is_some() {
                                info!("Output stream recreated successfully");
                                stream_retry_counter = 0;
                            }
                        }
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    info!("Command channel closed, exiting player thread");
                    break;
                }
            }

            let is_playing = sink.as_ref().map(|s| !s.is_paused()).unwrap_or(false);

            if is_playing {
                let elapsed = start_time.map(|t| t.elapsed().as_secs_f64()).unwrap_or(0.0);
                let position = base_position + elapsed;

                if has_source && sink.as_ref().map(|s| s.empty()).unwrap_or(false) {
                    if let Some(s) = sink.take() {
                        s.stop();
                    }
                    has_source = false;
                    start_time = None;
                    base_position = 0.0;
                    duration = None;

                    let mut st = state.blocking_write();
                    st.state = PlaybackState::Stopped;
                    st.current_path = None;
                    st.position = 0.0;
                    st.duration = None;

                    let _ = app_handle.emit("track_finished", "");

                    info!("Track finished");
                    continue;
                }

                if last_emit.elapsed().as_millis() >= 500 {
                    last_emit = Instant::now();

                    let mut st = state.blocking_write();
                    st.position = position;

                    let _ = app_handle.emit("playback_progress", serde_json::json!({
                        "position": position,
                        "duration": duration.unwrap_or(0.0)
                    }));
                }
            }
        }
    }

    pub async fn play(&self, path: &str) -> Result<(), String> {
        self.cmd_tx.send(PlayerCmd::Play(path.to_string()))
            .map_err(|_| "Channel closed".to_string())
    }

    pub async fn pause(&self) -> Result<(), String> {
        self.cmd_tx.send(PlayerCmd::Pause)
            .map_err(|_| "Channel closed".to_string())
    }

    pub async fn resume(&self) -> Result<(), String> {
        self.cmd_tx.send(PlayerCmd::Resume)
            .map_err(|_| "Channel closed".to_string())
    }

    pub async fn stop(&self) -> Result<(), String> {
        self.cmd_tx.send(PlayerCmd::Stop)
            .map_err(|_| "Channel closed".to_string())
    }

    pub async fn seek(&self, time: f64) -> Result<(), String> {
        self.cmd_tx.send(PlayerCmd::Seek(time))
            .map_err(|_| "Channel closed".to_string())
    }

    pub async fn set_volume(&self, volume: f32) -> Result<(), String> {
        self.cmd_tx.send(PlayerCmd::SetVolume(volume))
            .map_err(|_| "Channel closed".to_string())
    }

    pub async fn get_state(&self) -> PlayerState {
        self.state.read().await.clone()
    }
}

pub fn init(app_handle: AppHandle) -> Result<AudioPlayer, Box<dyn std::error::Error>> {
    info!("Initializing audio player...");
    AudioPlayer::new(app_handle)
}
