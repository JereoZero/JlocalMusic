use symphonia::core::audio::{SampleBuffer, SignalSpec};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use rodio::{Source, source::SeekError};
use std::fs::File;
use std::path::PathBuf;
use std::time::Duration;

#[allow(dead_code)]
pub struct SymphoniaFlacDecoder {
    path: PathBuf,
    format_reader: Box<dyn FormatReader>,
    decoder: Box<dyn symphonia::core::codecs::Decoder>,
    track_id: u32,
    sample_rate: u32,
    channels: u16,
    total_duration: Option<Duration>,
    sample_buffer: Option<SampleBuffer<i16>>,
    buffer_pos: usize,
    current_frame: u64,
}

impl SymphoniaFlacDecoder {
    pub fn new(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let path = PathBuf::from(path);
        let file = File::open(&path)?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());
        
        let mut hint = Hint::new();
        // 根据文件扩展名设置 hint
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        } else {
            hint.with_extension("flac");
        }
        
        let format_opts = FormatOptions::default();
        let metadata_opts = MetadataOptions::default();
        
        let probed = symphonia::default::get_probe().format(&hint, mss, &format_opts, &metadata_opts)?;
        let format_reader = probed.format;
        
        let track = format_reader.tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or("No audio track found")?;
        
        let track_id = track.id;
        let codec_params = &track.codec_params;
        
        let sample_rate = codec_params.sample_rate.unwrap_or(44100);
        let channels = codec_params.channels.map(|c| c.count() as u16).unwrap_or(2);
        let total_duration = codec_params.time_base.and_then(|tb| {
            codec_params.n_frames.map(|frames| {
                let secs = frames as f64 * tb.numer as f64 / tb.denom as f64;
                Duration::from_secs_f64(secs)
            })
        });
        
        let decoder_opts = DecoderOptions::default();
        let decoder = symphonia::default::get_codecs().make(codec_params, &decoder_opts)?;
        
        Ok(Self {
            path,
            format_reader,
            decoder,
            track_id,
            sample_rate,
            channels,
            total_duration,
            sample_buffer: None,
            buffer_pos: 0,
            current_frame: 0,
        })
    }
    
    fn decode_next_packet(&mut self) -> bool {
        loop {
            match self.format_reader.next_packet() {
                Ok(packet) => {
                    if packet.track_id() != self.track_id {
                        continue;
                    }
                    
                    match self.decoder.decode(&packet) {
                        Ok(audio_buf) => {
                            let spec = SignalSpec::new(
                                audio_buf.spec().rate,
                                audio_buf.spec().channels,
                            );
                            let duration = audio_buf.capacity() as u64;
                            
                            let mut sample_buf = SampleBuffer::<i16>::new(duration, spec);
                            sample_buf.copy_interleaved_ref(audio_buf);
                            
                            self.sample_buffer = Some(sample_buf);
                            self.buffer_pos = 0;
                            self.current_frame += duration;
                            return true;
                        }
                        Err(_) => continue,
                    }
                }
                Err(SymphoniaError::IoError(_)) => return false,
                Err(_) => continue,
            }
        }
    }
}

impl Iterator for SymphoniaFlacDecoder {
    type Item = i16;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            if let Some(ref buf) = self.sample_buffer {
                if self.buffer_pos < buf.len() {
                    let sample = buf.samples()[self.buffer_pos];
                    self.buffer_pos += 1;
                    return Some(sample);
                }
            }
            
            if !self.decode_next_packet() {
                return None;
            }
        }
    }
}

impl Source for SymphoniaFlacDecoder {
    fn current_frame_len(&self) -> Option<usize> {
        self.sample_buffer.as_ref().map(|b| b.len() - self.buffer_pos)
    }

    fn channels(&self) -> u16 {
        self.channels
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn total_duration(&self) -> Option<Duration> {
        self.total_duration
    }
    
    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        let seek_to = SeekTo::Time {
            time: symphonia::core::units::Time::from(pos.as_secs_f64()),
            track_id: Some(self.track_id),
        };
        
        match self.format_reader.seek(SeekMode::Accurate, seek_to) {
            Ok(seeked_to) => {
                self.sample_buffer = None;
                self.buffer_pos = 0;
                self.current_frame = seeked_to.actual_ts;
                Ok(())
            }
            Err(_) => Err(SeekError::NotSupported { underlying_source: "symphonia seek" }),
        }
    }
}
