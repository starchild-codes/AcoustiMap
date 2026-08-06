"""Tests for audio_loader."""

import pytest
import numpy as np
from pathlib import Path
import tempfile

from app.analysis.audio_loader import load_audio, compute_checksum
from app.analysis.exceptions import AudioDecodeError, InvalidAudioError

from tests.analysis.fixtures import create_test_fixtures


@pytest.fixture(scope="module")
def fixtures():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield create_test_fixtures(tmpdir)


def test_wav_loads_correctly(fixtures):
    """WAV file loads with correct metadata."""
    loaded = load_audio(fixtures["sine_2000hz"])
    assert loaded.samples is not None
    assert loaded.sample_rate == 22050
    assert loaded.metadata["duration_seconds"] > 0
    assert loaded.metadata["channel_count"] >= 1
    assert loaded.metadata["frame_count"] > 0
    assert loaded.checksum != ""


def test_stereo_metadata_preserved(fixtures):
    """Stereo metadata is preserved before conversion."""
    loaded = load_audio(fixtures["stereo"])
    assert loaded.metadata["channel_count"] == 2
    assert loaded.samples.shape[1] == 2


def test_checksum_deterministic(fixtures):
    """Checksum is deterministic for the same file."""
    c1 = compute_checksum(fixtures["sine_2000hz"])
    c2 = compute_checksum(fixtures["sine_2000hz"])
    assert c1 == c2
    assert len(c1) == 64  # SHA-256 hex


def test_missing_file_raises_error():
    """Missing file raises AudioDecodeError."""
    with pytest.raises(AudioDecodeError, match="File not found"):
        load_audio("/nonexistent/path/file.wav")


def test_empty_file_raises_error(tmp_path):
    """Empty file raises AudioDecodeError."""
    empty_path = tmp_path / "empty.wav"
    empty_path.write_bytes(b"")
    with pytest.raises(AudioDecodeError, match="File is empty"):
        load_audio(str(empty_path))


def test_corrupt_file_raises_error(tmp_path):
    """Corrupt audio file raises a structured decode error."""
    corrupt_path = tmp_path / "corrupt.wav"
    corrupt_path.write_bytes(b"This is not a valid audio file")
    with pytest.raises(AudioDecodeError):
        load_audio(str(corrupt_path))
