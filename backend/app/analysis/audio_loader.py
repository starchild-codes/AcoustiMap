"""
Robust audio loader supporting WAV, FLAC, OGG, MP3, and M4A.

Retrieves technical metadata and computes SHA-256 checksums.
Returns structured errors rather than crashing the caller.
"""

import hashlib
import os
import logging
from pathlib import Path
from dataclasses import dataclass
import numpy as np
import soundfile as sf
import librosa

from .exceptions import AudioDecodeError, InvalidAudioError

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB safety limit


@dataclass
class LoadedAudio:
    """Result of loading an audio file."""
    samples: np.ndarray          # (channels, n) or (n,) for mono
    sample_rate: int
    metadata: dict
    checksum: str
    warnings: list[str]


def compute_checksum(file_path: str) -> str:
    """Compute SHA-256 checksum of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def load_audio(file_path: str) -> LoadedAudio:
    """
    Load an audio file and return samples + metadata.

    Supports WAV, FLAC natively via SoundFile.
    Supports OGG, MP3, M4A via Librosa (requires FFmpeg for compressed formats).

    Raises:
        AudioDecodeError: file missing, unreadable, or too large.
        InvalidAudioError: NaN/infinity samples or empty audio.
    """
    path = Path(file_path)

    if not path.exists():
        raise AudioDecodeError(f"File not found: {file_path}")

    if path.stat().st_size == 0:
        raise AudioDecodeError(f"File is empty (0 bytes): {file_path}")

    if path.stat().st_size > MAX_FILE_SIZE_BYTES:
        raise AudioDecodeError(
            f"File exceeds maximum size limit ({MAX_FILE_SIZE_BYTES // (1024*1024)} MB): {file_path}"
        )

    checksum = compute_checksum(str(path))
    file_size = path.stat().st_size
    warnings_list: list[str] = []

    # Try SoundFile first (WAV, FLAC)
    samples = None
    sample_rate = None
    original_channels = None
    subtype = None
    original_sr = None

    try:
        info = sf.info(str(path))
        original_sr = info.samplerate
        original_channels = info.channels
        subtype = info.subtype
        frames = info.frames

        # Read full audio preserving shape
        data, sr = sf.read(str(path), always_2d=True)
        # data shape: (frames, channels)
        samples = data  # keep 2D for now
        sample_rate = sr

    except Exception as sf_err:
        # Fall back to Librosa for OGG, MP3, M4A
        logger.debug("SoundFile failed for %s: %s. Trying Librosa.", file_path, sf_err)
        try:
            data, sr = librosa.load(str(path), sr=None, mono=False)
            if data.ndim == 1:
                data = data.reshape(1, -1)
            else:
                data = data  # (channels, n)
            samples = data.T  # convert to (frames, channels) to match SoundFile
            sample_rate = sr
            original_sr = sr
            original_channels = samples.shape[1]
            subtype = "unknown"
            frames = samples.shape[0]
        except Exception as lb_err:
            raise AudioDecodeError(
                f"Could not decode audio file {path.name}. "
                f"SoundFile error: {sf_err}; Librosa error: {lb_err}"
            )

    if samples is None or sample_rate is None:
        raise AudioDecodeError(f"Failed to load audio from {file_path}")

    if samples.shape[0] == 0:
        raise InvalidAudioError(f"Audio file contains zero samples: {file_path}")

    # Check for NaN / infinity
    if np.any(np.isnan(samples)) or np.any(np.isinf(samples)):
        raise InvalidAudioError(f"Audio contains NaN or infinite values: {file_path}")

    duration = frames / sample_rate if sample_rate > 0 else 0.0

    metadata = {
        "original_sample_rate": original_sr,
        "channel_count": original_channels,
        "frame_count": frames,
        "duration_seconds": duration,
        "subtype": subtype,
        "file_size_bytes": file_size,
        "checksum": checksum,
        "filename": path.name,
    }

    return LoadedAudio(
        samples=samples,          # (frames, channels)
        sample_rate=sample_rate,
        metadata=metadata,
        checksum=checksum,
        warnings=warnings_list,
    )
