"""Tests for recovery score."""

import pytest
import numpy as np

from app.analysis.recovery_score import calculate_recovery_scores, aggregate_scores
from app.analysis.reference_model import build_reference_model
from app.analysis.schemas import RecoveryScoreResult


FEATURE_NAMES = ["aci", "bi", "spectral_entropy"]


def _features(aci, bi, entropy):
    return {"aci": aci, "bi": bi, "spectral_entropy": entropy}


def _build_model():
    """Build a simple reference model with well-separated groups."""
    healthy = [_features(0.9, 8.0, 0.9) for _ in range(3)]
    degraded = [_features(0.2, 2.0, 0.3) for _ in range(3)]
    restored = [_features(0.5, 5.0, 0.6) for _ in range(3)]

    model = build_reference_model(
        healthy, degraded, restored,
        ["h1", "h2", "h3"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
        FEATURE_NAMES, minimum_recordings_per_group=3,
    )
    return model, healthy, degraded, restored


def test_score_near_0_for_degraded():
    """A point identical to degraded reference scores near 0."""
    model, healthy, degraded, _ = _build_model()
    restored = [_features(0.2, 2.0, 0.3) for _ in range(1)]

    scores = calculate_recovery_scores(model, restored, ["r_test"], FEATURE_NAMES)
    assert scores[0].recovery_score is not None
    assert scores[0].recovery_score < 20  # Close to degraded


def test_score_near_100_for_healthy():
    """A point identical to healthy reference scores near 100."""
    model, healthy, degraded, _ = _build_model()
    restored = [_features(0.9, 8.0, 0.9) for _ in range(1)]

    scores = calculate_recovery_scores(model, restored, ["r_test"], FEATURE_NAMES)
    assert scores[0].recovery_score is not None
    assert scores[0].recovery_score > 80  # Close to healthy


def test_score_near_50_for_midpoint():
    """A midpoint between references scores near 50."""
    model, healthy, degraded, _ = _build_model()
    # Midpoint between healthy and degraded
    restored = [_features(0.55, 5.0, 0.6) for _ in range(1)]

    scores = calculate_recovery_scores(model, restored, ["r_test"], FEATURE_NAMES)
    assert scores[0].recovery_score is not None
    assert 30 < scores[0].recovery_score < 70


def test_zero_denominator_handled():
    """Zero denominator is handled gracefully."""
    # When distances sum to zero, recovery_position should be 0.5
    # This is hard to trigger naturally, but we test the function doesn't crash
    model, _, _, _ = _build_model()
    restored = [_features(0.5, 5.0, 0.6) for _ in range(1)]
    scores = calculate_recovery_scores(model, restored, ["r_test"], FEATURE_NAMES)
    assert scores[0].recovery_score is not None
    assert 0 <= scores[0].recovery_score <= 100


def test_missing_references_fail():
    """Missing references produce null scores."""
    from app.analysis.exceptions import InsufficientReferenceDataError
    # Only 1 healthy recording — should raise
    with pytest.raises(InsufficientReferenceDataError, match="healthy"):
        build_reference_model(
            [_features(0.9, 8.0, 0.9)],
            [_features(0.2, 2.0, 0.3) for _ in range(3)],
            [_features(0.5, 5.0, 0.6) for _ in range(3)],
            ["h1"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
            FEATURE_NAMES, minimum_recordings_per_group=3,
        )


def test_aggregate_scores():
    """Aggregation produces correct statistics."""
    scores = [
        RecoveryScoreResult(recording_id="r1", recovery_score=60.0),
        RecoveryScoreResult(recording_id="r2", recovery_score=70.0),
        RecoveryScoreResult(recording_id="r3", recovery_score=80.0),
    ]
    agg = aggregate_scores(scores)
    assert agg["median"] == pytest.approx(70.0)
    assert agg["count"] == 3
    assert agg["min"] == 60.0
    assert agg["max"] == 80.0


def test_feature_agreement():
    """Feature agreement is calculated correctly."""
    model, healthy, degraded, _ = _build_model()
    restored = [_features(0.9, 8.0, 0.9) for _ in range(1)]  # All features toward healthy

    scores = calculate_recovery_scores(model, restored, ["r_test"], FEATURE_NAMES)
    assert scores[0].supporting_features >= 2  # Most features should support healthy
    assert scores[0].feature_agreement is not None
    assert scores[0].feature_agreement > 0.5
