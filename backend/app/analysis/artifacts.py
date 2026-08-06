"""
Spectrogram and waveform artifact generation using matplotlib and librosa.
"""

import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def generate_spectrogram(
    file_path: str,
    output_path: str,
    fft_size: int = 2048,
    hop_length: int = 512,
    freq_min: float = 0,
    freq_max: float | None = None,
    sample_rate: int = 22050,
    duration: float | None = None,
    figsize: tuple = (10, 4),
    dpi: int = 150,
) -> dict:
    """
    Generate a spectrogram image from an audio file.
    Returns metadata about the generated image.
    """
    try:
        y, sr = librosa.load(file_path, sr=sample_rate, mono=True, duration=duration)
    except Exception as e:
        logger.error("Failed to load audio for spectrogram: %s", e)
        return {"error": str(e)}

    if freq_max is None:
        freq_max = sr / 2

    S = np.abs(librosa.stft(y, n_fft=fft_size, hop_length=hop_length))
    S_db = librosa.amplitude_to_db(S, ref=np.max)

    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    img = librosa.display.specshow(S_db, sr=sr, hop_length=hop_length,
                                   x_axis='time', y_axis='linear',
                                   ax=ax, cmap='viridis')
    ax.set_ylim(freq_min, freq_max)
    ax.set_title('Spectrogram')
    fig.colorbar(img, ax=ax, format='%+2.0f dB')
    fig.tight_layout()

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=dpi, bbox_inches='tight')
    plt.close(fig)

    return {
        "path": output_path,
        "fft_size": fft_size,
        "hop_length": hop_length,
        "window_function": "hann",
        "freq_min": freq_min,
        "freq_max": freq_max,
        "duration": len(y) / sr,
        "sample_rate": sr,
    }


def generate_waveform_thumbnail(
    file_path: str,
    output_path: str,
    sample_rate: int = 22050,
    duration: float | None = None,
    figsize: tuple = (10, 2),
    dpi: int = 150,
) -> dict:
    """Generate a waveform thumbnail image."""
    try:
        y, sr = librosa.load(file_path, sr=sample_rate, mono=True, duration=duration)
    except Exception as e:
        logger.error("Failed to load audio for waveform: %s", e)
        return {"error": str(e)}

    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    times = np.arange(len(y)) / sr
    ax.plot(times, y, linewidth=0.3, color='#3c7349')
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Amplitude')
    ax.set_title('Waveform')
    fig.tight_layout()

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=dpi, bbox_inches='tight')
    plt.close(fig)

    return {"path": output_path, "duration": len(y) / sr, "sample_rate": sr}


def generate_thumbnail_spectrogram(
    file_path: str,
    output_path: str,
    fft_size: int = 2048,
    hop_length: int = 512,
    sample_rate: int = 22050,
) -> dict:
    """Generate a small thumbnail spectrogram."""
    return generate_spectrogram(
        file_path, output_path, fft_size, hop_length,
        sample_rate=sample_rate, figsize=(4, 2), dpi=80,
    )
