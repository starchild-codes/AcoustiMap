"""Tests for segmentation."""

import pytest
import numpy as np

from app.analysis.segmentation import segment_audio


def test_basic_segmentation():
    """Audio is divided into correct number of segments."""
    sr = 22050
    duration = 60  # 60 seconds
    audio = np.random.uniform(-0.1, 0.1, duration * sr).astype(np.float32)
    segments = segment_audio(audio, sr, "rec_001", segment_duration_seconds=30.0)
    assert len(segments) == 2
    assert segments[0].duration == 30.0
    assert segments[1].duration == 30.0


def test_segment_ids():
    """Segment IDs follow the correct format."""
    sr = 22050
    audio = np.zeros(60 * sr, dtype=np.float32)
    segments = segment_audio(audio, sr, "rec_test", segment_duration_seconds=30.0)
    assert segments[0].segment_id == "rec_test__seg_0000"
    assert segments[1].segment_id == "rec_test__seg_0001"


def test_short_final_segment_excluded():
    """Final segment shorter than minimum is marked invalid."""
    sr = 22050
    # 35 seconds: one 30s segment + one 5s segment
    audio = np.zeros(35 * sr, dtype=np.float32)
    segments = segment_audio(audio, sr, "rec_001",
                              segment_duration_seconds=30.0,
                              minimum_valid_duration_seconds=10.0)
    assert len(segments) == 2
    assert segments[0].is_valid
    assert not segments[1].is_valid  # 5s < 10s minimum
    assert segments[1].exclusion_reason is not None


def test_short_recording_as_one_segment():
    """Recording shorter than segment duration but above minimum is one segment."""
    sr = 22050
    audio = np.zeros(10 * sr, dtype=np.float32)
    segments = segment_audio(audio, sr, "rec_001",
                              segment_duration_seconds=30.0,
                              minimum_valid_duration_seconds=5.0)
    assert len(segments) == 1
    assert segments[0].is_valid
    assert segments[0].duration == 10.0


def test_overlap():
    """Overlapping segments produce more segments."""
    sr = 22050
    audio = np.zeros(60 * sr, dtype=np.float32)
    # 30s segments with 10s overlap = hop of 20s
    segments = segment_audio(audio, sr, "rec_001",
                              segment_duration_seconds=30.0,
                              segment_overlap_seconds=10.0)
    assert len(segments) >= 3  # 0-30, 20-50, 40-70(clipped to 60)
