"""Tests for spectrogram generation."""

import pytest
import numpy as np
from pathlib import Path
import tempfile

from app.analysis.spectrograms import generate_spectrogram, generate_waveform, generate_all_artifacts
from app.analysis.exceptions import ArtifactGenerationError
from tests.analysis.fixtures import generate_sine_wave


def test_spectrogram_generated(tmp_path):
    """Spectrogram PNG is generated from real audio."""
    audio = generate_sine_wave(2000, 5, 22050, amplitude=0.5)
    output = str(tmp_path / "spec.png")
    meta = generate_spectrogram(audio, 22050, output)
    assert Path(output).exists()
    assert meta["n_fft"] == 2048
    assert meta["sample_rate"] == 22050


def test_waveform_generated(tmp_path):
    """Waveform PNG is generated from real audio."""
    audio = generate_sine_wave(1000, 5, 22050, amplitude=0.5)
    output = str(tmp_path / "wave.png")
    meta = generate_waveform(audio, 22050, output)
    assert Path(output).exists()
    assert meta["duration"] > 0


def test_all_artifacts_generated(tmp_path):
    """All artifacts are generated for a recording."""
    audio = generate_sine_wave(2000, 5, 22050, amplitude=0.5)
    artifacts = generate_all_artifacts(audio, 22050, "test_rec", str(tmp_path), {})
    assert "waveform" in artifacts
    assert "spectrogram" in artifacts
    assert Path(artifacts["waveform"]["path"]).exists()
    assert Path(artifacts["spectrogram"]["path"]).exists()
