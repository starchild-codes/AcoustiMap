"""
Deterministic audio preprocessing.

Steps:
1. Channel conversion (mono/stereo)
2. DC offset removal
3. Resampling to target sample rate
4. Amplitude normalisation (none/peak/rms)
5. Invalid value detection
"""

import numpy as np
import librosa
from dataclasses import dataclass
from .exceptions import InvalidAudioError


@dataclass
class PreprocessedAudio:
    """Result of preprocessing."""
    samples: np.ndarray       # 1D float32 array
    sample_rate: int
    metadata: dict


def preprocess(
    samples: np.ndarray,   # (frames, channels) from loader
    source_sample_rate: int,
    target_sample_rate: int = 22050,
    channel_mode: str = "mono",
    remove_dc_offset: bool = True,
    amplitude_normalization: str = "none",
) -> PreprocessedAudio:
    """
    Preprocess audio samples deterministically.

    Args:
        samples: (frames, channels) array from the loader.
        source_sample_rate: Original sample rate.
        target_sample_rate: Desired output sample rate.
        channel_mode: "mono" or "stereo".
        remove_dc_offset: Remove DC offset before resampling.
        amplitude_normalization: "none", "peak", or "rms".

    Returns:
        PreprocessedAudio with 1D (mono) or 2D (stereo, frames x 2) samples.
    """
    if samples.size == 0:
        raise InvalidAudioError("Cannot preprocess empty audio buffer.")

    # Step 1: Channel conversion
    original_channels = samples.shape[1] if samples.ndim > 1 else 1
    if samples.ndim == 1:
        samples = samples.reshape(-1, 1)

    if channel_mode == "mono":
        # Average channels to mono
        audio = np.mean(samples, axis=1).astype(np.float32)
    else:
        # Keep stereo (or up-mix mono to stereo by duplication)
        if original_channels == 1:
            audio = np.column_stack([samples[:, 0], samples[:, 0]]).astype(np.float32)
        else:
            audio = samples.astype(np.float32)

    dc_offset_value = 0.0
    dc_removed = False

    # Step 2: DC offset removal
    if remove_dc_offset:
        if audio.ndim == 1:
            dc_offset_value = float(np.mean(audio))
            audio = audio - dc_offset_value
            dc_removed = True
        else:
            for ch in range(audio.shape[1]):
                ch_dc = float(np.mean(audio[:, ch]))
                audio[:, ch] = audio[:, ch] - ch_dc
            dc_offset_value = float(np.mean(audio))
            dc_removed = True

    # Step 3: Resample
    resampled = False
    if target_sample_rate != source_sample_rate:
        if audio.ndim == 1:
            audio = librosa.resample(audio, orig_sr=source_sample_rate, target_sr=target_sample_rate)
        else:
            # Resample each channel
            channels_resampled = [
                librosa.resample(audio[:, ch], orig_sr=source_sample_rate, target_sr=target_sample_rate)
                for ch in range(audio.shape[1])
            ]
            min_len = min(c.shape[0] for c in channels_resampled)
            audio = np.column_stack([c[:min_len] for c in channels_resampled]).astype(np.float32)
        resampled = True

    # Step 4: Amplitude normalisation
    normalization_gain = 1.0
    if amplitude_normalization == "peak":
        peak = float(np.max(np.abs(audio)))
        if peak > 0:
            normalization_gain = 1.0 / peak
            audio = audio * normalization_gain
        # If peak is 0 (silence), leave as-is (preserve silence)
    elif amplitude_normalization == "rms":
        rms = float(np.sqrt(np.mean(audio ** 2)))
        if rms > 1e-10:
            # Target RMS of 0.1 to avoid extreme gain
            target_rms = 0.1
            normalization_gain = target_rms / rms
            # Clamp gain to avoid extreme values
            normalization_gain = np.clip(normalization_gain, 0.01, 100.0)
            audio = audio * normalization_gain
        else:
            # Nearly silent signal — do not apply extreme gain
            pass

    # Step 5: Final NaN/inf check
    if np.any(np.isnan(audio)) or np.any(np.isinf(audio)):
        raise InvalidAudioError("NaN or infinite values detected after preprocessing.")

    metadata = {
        "original_sample_rate": source_sample_rate,
        "target_sample_rate": target_sample_rate,
        "channel_mode": channel_mode,
        "original_channels": original_channels,
        "dc_offset_removed": dc_removed,
        "dc_offset_value": dc_offset_value,
        "amplitude_normalization": amplitude_normalization,
        "normalization_gain": float(normalization_gain),
        "resampled": resampled,
        "processed_duration_seconds": audio.shape[0] / target_sample_rate,
        "processed_sample_count": audio.shape[0],
    }

    return PreprocessedAudio(samples=audio, sample_rate=target_sample_rate, metadata=metadata)
