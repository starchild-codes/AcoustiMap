"""Tests for aggregation."""

import pytest
import numpy as np

from app.analysis.aggregation import aggregate_segments, build_modelling_matrix
from app.analysis.schemas import (
    SegmentResult, SegmentInfo, TechnicalFeatures, EcoacousticFeatures,
    QualityFlag, RecordingResult,
)


def _make_segment_result(seg_id: str, aci=0.5, bi=5.0, valid=True, fatal=False) -> SegmentResult:
    flags = [QualityFlag(code="FATAL", severity="fatal", message="test")] if fatal else []
    return SegmentResult(
        segment_id=seg_id,
        segment_info=SegmentInfo(segment_id=seg_id, index=0, start_time=0, end_time=30,
                                  duration=30, sample_count=22050*30, is_valid=valid),
        technical=TechnicalFeatures(duration=30.0, rms_amplitude=0.1),
        ecoacoustic=EcoacousticFeatures(aci=aci, bi=bi),
        quality_flags=flags,
    )


def test_aggregation_uses_median():
    """Recording-level features use median of segments."""
    segs = [
        _make_segment_result("s1", aci=0.3),
        _make_segment_result("s2", aci=0.5),
        _make_segment_result("s3", aci=0.7),
    ]
    result = aggregate_segments(segs, "rec_001")
    assert result.ecoacoustic.aci == pytest.approx(0.5, rel=0.01)
    assert result.valid_segment_count == 3


def test_aggregation_excludes_fatal_segments():
    """Segments with fatal flags are excluded."""
    segs = [
        _make_segment_result("s1", aci=0.3),
        _make_segment_result("s2", aci=0.5, fatal=True),
    ]
    result = aggregate_segments(segs, "rec_001")
    assert result.valid_segment_count == 1
    assert result.ecoacoustic.aci == pytest.approx(0.3, rel=0.01)


def test_all_failed_returns_failed_status():
    """All failed segments result in failed recording."""
    segs = [_make_segment_result("s1", fatal=True)]
    result = aggregate_segments(segs, "rec_001")
    assert result.quality_status == "failed"


def test_modelling_matrix_drops_missing_features():
    """Modelling matrix drops features that are entirely None."""
    recs = [
        RecordingResult(recording_id="r1", quality_status="valid",
                       technical=TechnicalFeatures(),
                       ecoacoustic=EcoacousticFeatures(aci=0.5, bi=None, spectral_entropy=0.7)),
        RecordingResult(recording_id="r2", quality_status="valid",
                       technical=TechnicalFeatures(),
                       ecoacoustic=EcoacousticFeatures(aci=0.6, bi=None, spectral_entropy=0.8)),
    ]
    matrix, features, rec_ids, excluded = build_modelling_matrix(recs, ["aci", "bi", "spectral_entropy"])
    assert matrix is not None
    assert "bi" not in features  # Dropped because all None
    assert "aci" in features
    assert "spectral_entropy" in features
    assert matrix.shape[1] == 2  # Only aci and spectral_entropy
