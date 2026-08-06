"""Tests for preprocessing."""

import pytest
import numpy as np

from app.analysis.preprocessing import preprocess
from app.analysis.exceptions import InvalidAudioError


def test_mono_conversion():
    """Stereo signal is converted to mono by averaging."""
    stereo = np.column_stack([np.ones(1000), np.zeros(1000)]).astype(np.float32)
    result = preprocess(stereo, 22050, target_sample_rate=22050, channel_mode="mono", remove_dc_offset=False)
    assert result.samples.ndim == 1
    assert np.allclose(result.samples, np.ones(1000) * 0.5, atol=0.01)


def test_resampling_length():
    """Resampling changes the sample count proportionally."""
    audio = np.ones(44100, dtype=np.float32).reshape(-1, 1)
    result = preprocess(audio, 44100, target_sample_rate=22050, channel_mode="mono")
    expected_len = 22050  # 1 second at 22050 Hz
    assert abs(result.samples.shape[0] - expected_len) < 100


def test_dc_offset_removal():
    """DC offset is removed when enabled."""
    audio = (np.ones(1000, dtype=np.float32) * 0.1 + np.sin(np.linspace(0, 10, 1000)).astype(np.float32) * 0.01).reshape(-1, 1)
    result = preprocess(audio, 22050, target_sample_rate=22050, channel_mode="mono", remove_dc_offset=True)
    assert abs(np.mean(result.samples)) < 1e-5


def test_peak_normalization():
    """Peak normalisation scales to peak of 1.0."""
    audio = (np.sin(np.linspace(0, 100, 10000)) * 0.1).astype(np.float32).reshape(-1, 1)
    result = preprocess(audio, 22050, target_sample_rate=22050, channel_mode="mono",
                         amplitude_normalization="peak")
    assert abs(np.max(np.abs(result.samples)) - 1.0) < 0.01
    assert result.metadata["normalization_gain"] > 1.0


def test_silence_remains_silence():
    """Peak normalisation preserves silence (no division by zero)."""
    audio = np.zeros(1000, dtype=np.float32).reshape(-1, 1)
    result = preprocess(audio, 22050, target_sample_rate=22050, channel_mode="mono",
                         amplitude_normalization="peak")
    assert np.allclose(result.samples, 0.0)


def test_no_nan_or_infinity():
    """No NaN or infinity values after preprocessing."""
    audio = np.random.uniform(-0.5, 0.5, 10000).astype(np.float32).reshape(-1, 1)
    result = preprocess(audio, 22050, target_sample_rate=22050, channel_mode="mono",
                         amplitude_normalization="rms")
    assert not np.any(np.isnan(result.samples))
    assert not np.any(np.isinf(result.samples))


def test_empty_audio_raises():
    """Empty audio raises InvalidAudioError."""
    with pytest.raises(InvalidAudioError):
        preprocess(np.array([]), 22050)
