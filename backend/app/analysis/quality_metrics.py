"""
Technical audio-quality metrics.

All calculations are documented with formulas. Every metric is computed
from actual decoded audio samples — no random or placeholder values.
"""

import numpy as np
import librosa
from scipy import signal as scipy_signal


def calculate_technical_features(
    audio: np.ndarray,
    sample_rate: int,
    config: dict | None = None,
) -> dict:
    """
    Calculate technical quality metrics from audio.

    Args:
        audio: 1D float array (mono).
        sample_rate: Sample rate in Hz.
        config: Configuration dict with thresholds.

    Returns:
        Dict of technical features. None for failed calculations.
    """
    cfg = config or {}
    silence_threshold_dbfs = cfg.get("silence_rms_threshold_dbfs", -50.0)
    clipping_threshold = cfg.get("clipping_amplitude_threshold", 0.99)
    low_freq_cutoff = cfg.get("low_frequency_cutoff_hz", 300.0)

    n = len(audio)
    if n == 0:
        return {k: None for k in _FEATURE_KEYS}

    # --- Amplitude statistics ---
    abs_audio = np.abs(audio)
    peak = float(np.max(abs_audio))
    rms = float(np.sqrt(np.mean(audio ** 2)))
    mean_amp = float(np.mean(audio))
    dc_offset = mean_amp

    # RMS in dBFS (reference: full scale = 1.0)
    rms_dbfs = 20 * np.log10(rms + 1e-10) if rms > 0 else -np.inf

    # Crest factor: peak / rms
    crest_factor = float(peak / (rms + 1e-10)) if rms > 0 else 0.0

    # Dynamic range estimate: difference between peak and RMS in dB
    dynamic_range_db = 20 * np.log10(peak / (rms + 1e-10)) if peak > 0 and rms > 0 else 0.0

    # --- Zero-crossing rate ---
    if n > 1:
        sign_changes = np.sum(np.diff(np.signbit(audio)))
        zcr = float(sign_changes / (n - 1))
    else:
        zcr = 0.0

    # --- Clipping detection ---
    # Sample-level near-clipping: abs(sample) >= threshold
    # Note: For compressed formats (MP3, M4A), this is sample-level near-clipping
    # detection only — it does not guarantee the original was unclipped.
    clipping_count = int(np.sum(abs_audio >= clipping_threshold))
    clipping_proportion = clipping_count / n if n > 0 else 0.0

    # --- Silence proportion ---
    # Use short-time RMS frames
    silence_frame_size = int(0.02 * sample_rate)  # 20ms frames
    silence_hop = silence_frame_size
    if silence_frame_size > n:
        silence_frame_size = n

    silence_frame_count = 0
    total_frames = 0
    silence_rms_linear = 10 ** (silence_threshold_dbfs / 20.0)

    for i in range(0, n - silence_frame_size + 1, silence_hop):
        frame = audio[i:i + silence_frame_size]
        frame_rms = np.sqrt(np.mean(frame ** 2))
        if frame_rms < silence_rms_linear:
            silence_frame_count += 1
        total_frames += 1

    silence_proportion = silence_frame_count / total_frames if total_frames > 0 else 0.0

    # --- Frequency band energy ---
    # Use FFT for energy distribution
    fft_size = min(4096, n)
    frame = audio[:fft_size]
    windowed = frame * np.hanning(fft_size)
    spectrum = np.abs(np.fft.rfft(windowed))
    bin_width = sample_rate / fft_size

    low_bin = int(low_freq_cutoff / bin_width)
    mid_bin = int(2000 / bin_width)  # Mid: 300-2000 Hz

    low_energy = float(np.sum(spectrum[1:low_bin] ** 2)) if low_bin > 1 else 0.0
    mid_energy = float(np.sum(spectrum[low_bin:mid_bin] ** 2)) if mid_bin > low_bin else 0.0
    high_energy = float(np.sum(spectrum[mid_bin:] ** 2)) if len(spectrum) > mid_bin else 0.0

    total_energy = low_energy + mid_energy + high_energy
    if total_energy > 0:
        low_prop = low_energy / total_energy
        mid_prop = mid_energy / total_energy
        high_prop = high_energy / total_energy
    else:
        low_prop = mid_prop = high_prop = 0.0

    # --- Spectral features (using librosa) ---
    spectral_centroid = None
    spectral_bandwidth = None
    spectral_rolloff = None
    spectral_flatness = None

    try:
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=audio, sr=sample_rate)))
    except Exception:
        pass

    try:
        spectral_bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=audio, sr=sample_rate)))
    except Exception:
        pass

    try:
        spectral_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=audio, sr=sample_rate)))
    except Exception:
        pass

    try:
        spectral_flatness = float(np.mean(librosa.feature.spectral_flatness(y=audio, sr=sample_rate)))
    except Exception:
        pass

    duration = n / sample_rate if sample_rate > 0 else 0.0
    original_sr = cfg.get("original_sample_rate", sample_rate)

    return {
        "duration": duration,
        "peak_amplitude": peak,
        "rms_amplitude": rms,
        "rms_dbfs": float(rms_dbfs) if np.isfinite(rms_dbfs) else None,
        "mean_amplitude": mean_amp,
        "dc_offset": dc_offset,
        "crest_factor": crest_factor,
        "zero_crossing_rate": zcr,
        "clipping_sample_count": clipping_count,
        "clipping_proportion": clipping_proportion,
        "silence_proportion": silence_proportion,
        "silence_frame_count": silence_frame_count,
        "silence_total_frames": total_frames,
        "dynamic_range_db": dynamic_range_db,
        "low_frequency_energy_proportion": low_prop,
        "mid_frequency_energy_proportion": mid_prop,
        "high_frequency_energy_proportion": high_prop,
        "spectral_centroid_hz": spectral_centroid,
        "spectral_bandwidth_hz": spectral_bandwidth,
        "spectral_rolloff_hz": spectral_rolloff,
        "spectral_flatness": spectral_flatness,
        "channel_count": 1,
        "original_sample_rate": original_sr,
        "processed_sample_rate": sample_rate,
    }


_FEATURE_KEYS = [
    "duration", "peak_amplitude", "rms_amplitude", "rms_dbfs", "mean_amplitude",
    "dc_offset", "crest_factor", "zero_crossing_rate", "clipping_sample_count",
    "clipping_proportion", "silence_proportion", "silence_frame_count",
    "silence_total_frames", "dynamic_range_db", "low_frequency_energy_proportion",
    "mid_frequency_energy_proportion", "high_frequency_energy_proportion",
    "spectral_centroid_hz", "spectral_bandwidth_hz", "spectral_rolloff_hz",
    "spectral_flatness", "channel_count", "original_sample_rate", "processed_sample_rate",
]
