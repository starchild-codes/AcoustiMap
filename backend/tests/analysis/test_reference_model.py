"""Tests for reference model."""

import pytest
import numpy as np

from app.analysis.reference_model import build_reference_model, extract_feature_vector
from app.analysis.exceptions import InsufficientReferenceDataError


def _features(aci, bi, entropy, occupancy, ndsi, noise):
    return {
        "aci": aci, "biological_band_spectral_magnitude_ratio": bi, "spectral_entropy": entropy,
        "biological_band_occupancy": occupancy,
        "ndsi": ndsi, "anthropogenic_noise_pressure": noise,
    }


FEATURE_NAMES = ["aci", "biological_band_spectral_magnitude_ratio", "spectral_entropy", "biological_band_occupancy", "ndsi", "anthropogenic_noise_pressure"]


def test_extract_feature_vector():
    """Feature vector extraction works."""
    f = _features(0.5, 5.0, 0.7, 0.6, 0.3, 0.2)
    vec = extract_feature_vector(f, FEATURE_NAMES)
    assert vec is not None
    assert len(vec) == 6
    assert vec[0] == 0.5


def test_extract_feature_vector_with_none():
    """None values return None vector."""
    f = _features(0.5, None, 0.7, 0.6, 0.3, 0.2)
    vec = extract_feature_vector(f, FEATURE_NAMES)
    assert vec is None


def test_insufficient_healthy_raises():
    """Fewer than minimum healthy recordings raises error."""
    with pytest.raises(InsufficientReferenceDataError, match="healthy"):
        build_reference_model(
            [_features(0.8, 7.0, 0.8, 0.7, 0.4, 0.1)],
            [_features(0.4, 4.0, 0.6, 0.4, 0.5, 0.4)] * 3,
            [_features(0.6, 6.0, 0.7, 0.6, 0.3, 0.2)] * 3,
            ["h1"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
            FEATURE_NAMES, minimum_recordings_per_group=3,
        )


def test_insufficient_degraded_raises():
    """Fewer than minimum degraded recordings raises error."""
    with pytest.raises(InsufficientReferenceDataError, match="degraded"):
        build_reference_model(
            [_features(0.8, 7.0, 0.8, 0.7, 0.4, 0.1)] * 3,
            [_features(0.4, 4.0, 0.6, 0.4, 0.5, 0.4)],
            [_features(0.6, 6.0, 0.7, 0.6, 0.3, 0.2)] * 3,
            ["h1", "h2", "h3"], ["d1"], ["r1", "r2", "r3"],
            FEATURE_NAMES, minimum_recordings_per_group=3,
        )


def test_model_builds_with_sufficient_data():
    """Model builds correctly with sufficient data."""
    healthy = [_features(0.8, 7.0, 0.8, 0.7, 0.4, 0.1) for _ in range(3)]
    degraded = [_features(0.4, 4.0, 0.6, 0.4, 0.5, 0.4) for _ in range(3)]
    restored = [_features(0.6, 6.0, 0.7, 0.6, 0.3, 0.2) for _ in range(3)]

    model = build_reference_model(
        healthy, degraded, restored,
        ["h1", "h2", "h3"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
        FEATURE_NAMES, minimum_recordings_per_group=3,
    )

    assert model.healthy_centroid is not None
    assert model.degraded_centroid is not None
    assert len(model.healthy_recording_ids) == 3
    assert len(model.degraded_recording_ids) == 3


def test_scaler_fitted_on_reference_only():
    """Scaler is fitted using reference recordings only."""
    healthy = [_features(0.8, 7.0, 0.8, 0.7, 0.4, 0.1) for _ in range(3)]
    degraded = [_features(0.4, 4.0, 0.6, 0.4, 0.5, 0.4) for _ in range(3)]
    restored = [_features(0.6, 6.0, 0.7, 0.6, 0.3, 0.2) for _ in range(3)]

    model = build_reference_model(
        healthy, degraded, restored,
        ["h1", "h2", "h3"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
        FEATURE_NAMES, scaling_method="standard", minimum_recordings_per_group=3,
    )

    # Scaler should be fitted on 6 recordings (3 healthy + 3 degraded)
    assert len(model.scaler_fitted_ids) == 6
    assert "r1" not in model.scaler_fitted_ids
