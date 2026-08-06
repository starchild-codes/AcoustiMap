"""
Real spectrogram and waveform artifact generation using Matplotlib and Librosa.

Generates PNG images with proper axes, colour bars, and metadata.
Uses 'viridis' colormap (not misleading rainbow palettes).
Closes all figures after saving to prevent memory leaks.
"""

import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
import logging

from .exceptions import ArtifactGenerationError

logger = logging.getLogger(__name__)


def _ensure_dir(path: str | Path) -> Path:
    """Ensure parent directory exists."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def generate_spectrogram(
    audio: np.ndarray,
    sample_rate: int,
    output_path: str,
    n_fft: int = 2048,
    hop_length: int = 512,
    freq_min_hz: float = 0,
    freq_max_hz: float | None = None,
    title: str = "",
    figsize=(10, 4),
    dpi: int = 150,
) -> dict:
    """
    Generate a spectrogram PNG from audio samples.

    Returns metadata about the generated image.
    """
    if freq_max_hz is None:
        freq_max_hz = sample_rate / 2

    try:
        S = np.abs(librosa.stft(audio, n_fft=n_fft, hop_length=hop_length))
        S_db = librosa.amplitude_to_db(S, ref=np.max)

        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        img = librosa.display.specshow(
            S_db, sr=sample_rate, hop_length=hop_length,
            x_axis='time', y_axis='linear', ax=ax, cmap='viridis',
        )
        ax.set_ylim(freq_min_hz, freq_max_hz)
        if title:
            ax.set_title(title, fontsize=10)
        fig.colorbar(img, ax=ax, format='%+2.0f dB', label='Intensity (dB)')
        fig.tight_layout()

        _ensure_dir(output_path)
        fig.savefig(output_path, dpi=dpi, bbox_inches='tight')
        plt.close(fig)

        return {
            "path": output_path,
            "n_fft": n_fft,
            "hop_length": hop_length,
            "window": "hann",
            "freq_min_hz": freq_min_hz,
            "freq_max_hz": freq_max_hz,
            "duration": len(audio) / sample_rate,
            "sample_rate": sample_rate,
        }
    except Exception as e:
        logger.error("Spectrogram generation failed: %s", e)
        raise ArtifactGenerationError(f"Spectrogram generation failed: {e}")


def generate_waveform(
    audio: np.ndarray,
    sample_rate: int,
    output_path: str,
    title: str = "",
    figsize=(10, 2),
    dpi: int = 150,
) -> dict:
    """Generate a waveform PNG from audio samples."""
    try:
        times = np.arange(len(audio)) / sample_rate

        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        ax.plot(times, audio, linewidth=0.3, color='#3c7349')
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('Amplitude')
        if title:
            ax.set_title(title, fontsize=10)
        fig.tight_layout()

        _ensure_dir(output_path)
        fig.savefig(output_path, dpi=dpi, bbox_inches='tight')
        plt.close(fig)

        return {
            "path": output_path,
            "duration": len(audio) / sample_rate,
            "sample_rate": sample_rate,
        }
    except Exception as e:
        logger.error("Waveform generation failed: %s", e)
        raise ArtifactGenerationError(f"Waveform generation failed: {e}")


def generate_spectrogram_thumbnail(
    audio: np.ndarray,
    sample_rate: int,
    output_path: str,
    n_fft: int = 2048,
    hop_length: int = 512,
) -> dict:
    """Generate a small thumbnail spectrogram."""
    return generate_spectrogram(
        audio, sample_rate, output_path,
        n_fft=n_fft, hop_length=hop_length,
        figsize=(4, 2), dpi=80,
    )


def generate_all_artifacts(
    audio: np.ndarray,
    sample_rate: int,
    recording_id: str,
    artifacts_dir: str,
    config: dict | None = None,
) -> dict:
    """
    Generate all standard artifacts for a recording.

    Returns a dict of artifact paths and metadata.
    """
    cfg = config or {}
    n_fft = cfg.get("n_fft", 2048)
    hop_length = cfg.get("hop_length", 512)
    freq_min = cfg.get("frequency_min_hz", 0)
    freq_max = cfg.get("frequency_max_hz", sample_rate / 2)

    artifacts: dict = {}

    # Waveform
    waveform_path = str(Path(artifacts_dir) / "waveforms" / f"{recording_id}_waveform.png")
    try:
        artifacts["waveform"] = generate_waveform(audio, sample_rate, waveform_path, title=recording_id)
    except ArtifactGenerationError as e:
        logger.warning("Waveform artifact failed for %s: %s", recording_id, e)

    # Full spectrogram
    spec_path = str(Path(artifacts_dir) / "spectrograms" / f"{recording_id}_spectrogram.png")
    try:
        artifacts["spectrogram"] = generate_spectrogram(
            audio, sample_rate, spec_path,
            n_fft=n_fft, hop_length=hop_length,
            freq_min_hz=freq_min, freq_max_hz=freq_max,
            title=recording_id,
        )
    except ArtifactGenerationError as e:
        logger.warning("Spectrogram artifact failed for %s: %s", recording_id, e)

    # Spectrogram thumbnail
    thumb_path = str(Path(artifacts_dir) / "spectrograms" / f"{recording_id}_spectrogram_thumb.png")
    try:
        artifacts["spectrogram_thumbnail"] = generate_spectrogram_thumbnail(
            audio, sample_rate, thumb_path, n_fft=n_fft, hop_length=hop_length,
        )
    except ArtifactGenerationError as e:
        logger.warning("Spectrogram thumbnail failed for %s: %s", recording_id, e)

    return artifacts
