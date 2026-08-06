"""Tests for quality metrics."""

import pytest
import numpy as np

from app.analysis.quality_metrics import calculate_technical_features
from app.analysis.feature_pipeline import evaluate_quality_flags, suggest_quality_status

from tests.analysis.fixtures import (
    generate_silence, generate_sine_wave, generate_clipped_sine, generate_short_signal
)


def test_silence_flagged():
    """Silence is flagged as near_silence."""
    audio = generate_silence(10, 22050)
    features = calculate_technical_features(audio, 22050)
    flags = evaluate_quality_flags(features, [], {"silence_rms_threshold_dbfs": -50.0})
    codes = [f.code for f in flags]
    assert "NEAR_SILENCE" in codes or "HIGH_SILENCE_PROPORTION" in codes


def test_clipped_signal_flagged():
    """Clipped signals are flagged with EXCESSIVE_CLIPPING."""
    audio = generate_clipped_sine(1000, 10, 22050, amplitude=1.5)
    features = calculate_technical_features(audio, 22050)
    flags = evaluate_quality_flags(features, [], {})
    codes = [f.code for f in flags]
    assert "EXCESSIVE_CLIPPING" in codes


def test_short_signal_flagged():
    """Short signals are flagged with TOO_SHORT."""
    audio = generate_short_signal(2, 22050)
    features = calculate_technical_features(audio, 22050)
    flags = evaluate_quality_flags(features, [], {"minimum_valid_duration_seconds": 5.0})
    codes = [f.code for f in flags]
    assert "TOO_SHORT" in codes


def test_low_frequency_dominance_detected():
    """Low-frequency dominance is detected."""
    audio = generate_sine_wave(100, 10, 22050, amplitude=0.5)
    features = calculate_technical_features(audio, 22050)
    flags = evaluate_quality_flags(features, [], {"low_frequency_noise_warning": 0.5})
    codes = [f.code for f in flags]
    assert "LOW_FREQUENCY_DOMINANCE" in codes


def test_normal_signal_avoids_fatal_flags():
    """A normal signal avoids fatal and exclude flags."""
    audio = generate_sine_wave(2000, 10, 22050, amplitude=0.3)
    features = calculate_technical_features(audio, 22050)
    flags = evaluate_quality_flags(features, [], {"minimum_valid_duration_seconds": 5.0})
    fatal = [f for f in flags if f.severity == "fatal"]
    exclude = [f for f in flags if f.severity == "exclude_recommended"]
    assert len(fatal) == 0
    assert len(exclude) == 0


def test_suggest_quality_status():
    """Quality status suggestion works correctly."""
    from app.analysis.schemas import QualityFlag as QF
    no_flags: list[QF] = []
    assert suggest_quality_status(no_flags)[0] == "valid"

    review_flags = [QF(code="TEST", severity="review", message="test")]
    assert suggest_quality_status(review_flags)[0] == "review"

    fatal_flags = [QF(code="TEST", severity="fatal", message="test")]
    assert suggest_quality_status(fatal_flags)[0] == "failed"


def test_rms_dbfs_calculation():
    """RMS in dBFS is calculated correctly."""
    # Full-scale sine wave: RMS = 1/sqrt(2) ≈ -3.01 dBFS
    audio = generate_sine_wave(1000, 1, 22050, amplitude=1.0)
    features = calculate_technical_features(audio, 22050)
    assert features["rms_dbfs"] is not None
    assert abs(features["rms_dbfs"] - (-3.01)) < 0.5


def test_zero_crossing_rate():
    """Zero-crossing rate is reasonable for a sine wave."""
    # 1000 Hz sine at 22050 Hz: ZCR ≈ 2*1000/22050 ≈ 0.0907
    audio = generate_sine_wave(1000, 1, 22050, amplitude=0.5)
    features = calculate_technical_features(audio, 22050)
    assert abs(features["zero_crossing_rate"] - 0.0907) < 0.01
