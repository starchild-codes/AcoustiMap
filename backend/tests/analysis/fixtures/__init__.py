"""
Synthetic test-signal generator.

Generates deterministic test signals for unit and integration tests.
All signals are clearly marked as synthetic technical test audio — not ecological data.

Uses fixed seeds for reproducibility.
"""

import numpy as np
import soundfile as sf
from pathlib import Path
import tempfile


def generate_silence(duration_s: float = 5.0, sample_rate: int = 22050) -> np.ndarray:
    """Generate pure silence."""
    return np.zeros(int(duration_s * sample_rate), dtype=np.float32)


def generate_sine_wave(freq_hz: float, duration_s: float = 5.0, sample_rate: int = 22050,
                       amplitude: float = 0.5) -> np.ndarray:
    """Generate a pure sine wave."""
    t = np.arange(int(duration_s * sample_rate)) / sample_rate
    return (amplitude * np.sin(2 * np.pi * freq_hz * t)).astype(np.float32)


def generate_white_noise(duration_s: float = 5.0, sample_rate: int = 22050,
                         amplitude: float = 0.3, seed: int = 42) -> np.ndarray:
    """Generate white noise."""
    rng = np.random.RandomState(seed)
    return (amplitude * rng.uniform(-1, 1, int(duration_s * sample_rate))).astype(np.float32)


def generate_pink_noise(duration_s: float = 5.0, sample_rate: int = 22050,
                        amplitude: float = 0.3, seed: int = 42) -> np.ndarray:
    """Generate a pink-noise approximation (1/f spectrum)."""
    rng = np.random.RandomState(seed)
    n = int(duration_s * sample_rate)
    white = rng.uniform(-1, 1, n)
    # Simple 1/f filter
    from scipy import signal as sig
    b, a = sig.butter(1, 0.5, btype='low')
    pink = sig.lfilter(b, a, white)
    pink = pink / np.max(np.abs(pink)) * amplitude if np.max(np.abs(pink)) > 0 else pink
    return pink.astype(np.float32)


def generate_multi_tone(freqs: list[float], duration_s: float = 5.0, sample_rate: int = 22050,
                         amplitude: float = 0.3) -> np.ndarray:
    """Generate a multi-tone signal."""
    t = np.arange(int(duration_s * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    for f in freqs:
        signal += amplitude * np.sin(2 * np.pi * f * t) / len(freqs)
    return signal.astype(np.float32)


def generate_clipped_sine(freq_hz: float = 1000, duration_s: float = 5.0, sample_rate: int = 22050,
                           amplitude: float = 1.5) -> np.ndarray:
    """Generate a clipped sine wave (amplitude > 1.0 causes clipping)."""
    t = np.arange(int(duration_s * sample_rate)) / sample_rate
    signal = amplitude * np.sin(2 * np.pi * freq_hz * t)
    # Simulate digital clipping
    signal = np.clip(signal, -1.0, 1.0)
    return signal.astype(np.float32)


def generate_am_signal(carrier_hz: float = 2000, mod_hz: float = 5, duration_s: float = 5.0,
                        sample_rate: int = 22050, amplitude: float = 0.5) -> np.ndarray:
    """Generate an amplitude-modulated signal."""
    t = np.arange(int(duration_s * sample_rate)) / sample_rate
    carrier = np.sin(2 * np.pi * carrier_hz * t)
    modulation = 0.5 + 0.5 * np.sin(2 * np.pi * mod_hz * t)
    return (amplitude * carrier * modulation).astype(np.float32)


def generate_intermittent_pulses(pulse_hz: float = 2000, pulse_duration_s: float = 0.1,
                                 interval_s: float = 1.0, total_duration_s: float = 10.0,
                                 sample_rate: int = 22050, amplitude: float = 0.5) -> np.ndarray:
    """Generate intermittent pulses."""
    n = int(total_duration_s * sample_rate)
    signal = np.zeros(n, dtype=np.float32)
    pulse_samples = int(pulse_duration_s * sample_rate)
    interval_samples = int(interval_s * sample_rate)

    pos = 0
    while pos + pulse_samples < n:
        t = np.arange(pulse_samples) / sample_rate
        signal[pos:pos + pulse_samples] = amplitude * np.sin(2 * np.pi * pulse_hz * t)
        pos += interval_samples

    return signal


def generate_stereo_different(freq_left: float = 500, freq_right: float = 2000,
                               duration_s: float = 5.0, sample_rate: int = 22050,
                               amplitude: float = 0.5) -> np.ndarray:
    """Generate a stereo signal with different frequencies per channel."""
    t = np.arange(int(duration_s * sample_rate)) / sample_rate
    left = amplitude * np.sin(2 * np.pi * freq_left * t)
    right = amplitude * np.sin(2 * np.pi * freq_right * t)
    return np.column_stack([left, right]).astype(np.float32)


def generate_short_signal(duration_s: float = 2.0, sample_rate: int = 22050) -> np.ndarray:
    """Generate a signal shorter than the minimum valid duration."""
    return generate_sine_wave(1000, duration_s, sample_rate)


def save_wav(audio: np.ndarray, path: str, sample_rate: int = 22050):
    """Save audio as a WAV file."""
    if audio.ndim == 1:
        sf.write(path, audio, sample_rate, subtype='FLOAT')
    else:
        sf.write(path, audio, sample_rate, subtype='FLOAT')


def create_test_fixtures(output_dir: str) -> dict[str, str]:
    """
    Create all standard test fixtures as WAV files.

    Returns a dict of fixture name → file path.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    fixtures = {}

    sr = 22050

    # Silence
    path = str(out / "silence.wav")
    save_wav(generate_silence(10, sr), path, sr)
    fixtures["silence"] = path

    # 200 Hz sine (low frequency)
    path = str(out / "sine_200hz.wav")
    save_wav(generate_sine_wave(200, 10, sr), path, sr)
    fixtures["sine_200hz"] = path

    # 2000 Hz sine (biological band)
    path = str(out / "sine_2000hz.wav")
    save_wav(generate_sine_wave(2000, 10, sr), path, sr)
    fixtures["sine_2000hz"] = path

    # Multi-tone
    path = str(out / "multitone.wav")
    save_wav(generate_multi_tone([500, 2000, 5000, 8000], 10, sr), path, sr)
    fixtures["multitone"] = path

    # White noise
    path = str(out / "white_noise.wav")
    save_wav(generate_white_noise(10, sr), path, sr)
    fixtures["white_noise"] = path

    # Clipped sine
    path = str(out / "clipped.wav")
    save_wav(generate_clipped_sine(1000, 10, sr), path, sr)
    fixtures["clipped"] = path

    # Short signal
    path = str(out / "short.wav")
    save_wav(generate_short_signal(2, sr), path, sr)
    fixtures["short"] = path

    # Stereo
    path = str(out / "stereo.wav")
    save_wav(generate_stereo_different(500, 2000, 10, sr), path, sr)
    fixtures["stereo"] = path

    # AM signal
    path = str(out / "am_signal.wav")
    save_wav(generate_am_signal(2000, 5, 10, sr), path, sr)
    fixtures["am_signal"] = path

    # Intermittent pulses
    path = str(out / "pulses.wav")
    save_wav(generate_intermittent_pulses(2000, 0.1, 1.0, 10, sr), path, sr)
    fixtures["pulses"] = path

    return fixtures
