"""Tests for bootstrap."""

import pytest
import numpy as np

from app.analysis.bootstrap import run_bootstrap
from app.analysis.exceptions import InsufficientReferenceDataError


FEATURE_NAMES = ["aci", "bi", "spectral_entropy"]


def _features(aci, bi, entropy):
    return {"aci": aci, "bi": bi, "spectral_entropy": entropy}


def test_fixed_seed_reproducible():
    """Fixed seed gives reproducible output."""
    healthy = [_features(0.8, 7.0, 0.8) for _ in range(3)]
    degraded = [_features(0.3, 3.0, 0.4) for _ in range(3)]
    restored = [_features(0.6, 6.0, 0.6) for _ in range(3)]

    result1 = run_bootstrap(
        healthy, degraded, restored,
        ["h1", "h2", "h3"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
        FEATURE_NAMES, n_iterations=20, random_seed=42,
    )
    result2 = run_bootstrap(
        healthy, degraded, restored,
        ["h1", "h2", "h3"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
        FEATURE_NAMES, n_iterations=20, random_seed=42,
    )

    assert result1.median is not None
    assert result2.median is not None
    assert result1.median == pytest.approx(result2.median, rel=0.01)
    assert result1.successful_iterations == result2.successful_iterations


def test_insufficient_groups_fail():
    """Insufficient groups produce zero successful iterations."""
    healthy = [_features(0.8, 7.0, 0.8)]  # Only 1
    degraded = [_features(0.3, 3.0, 0.4) for _ in range(3)]
    restored = [_features(0.6, 6.0, 0.6) for _ in range(3)]

    result = run_bootstrap(
        healthy, degraded, restored,
        ["h1"], ["d1", "d2", "d3"], ["r1", "r2", "r3"],
        FEATURE_NAMES, n_iterations=10, random_seed=42,
        minimum_per_group=3,
    )

    # Most iterations should fail because healthy group is too small
    assert result.successful_iterations < result.requested_iterations


def test_successful_iteration_count():
    """Successful iteration count is accurate."""
    healthy = [_features(0.8, 7.0, 0.8) for _ in range(5)]
    degraded = [_features(0.3, 3.0, 0.4) for _ in range(5)]
    restored = [_features(0.6, 6.0, 0.6) for _ in range(5)]

    result = run_bootstrap(
        healthy, degraded, restored,
        [f"h{i}" for i in range(5)], [f"d{i}" for i in range(5)], [f"r{i}" for i in range(5)],
        FEATURE_NAMES, n_iterations=50, random_seed=42,
    )

    assert result.requested_iterations == 50
    assert result.successful_iterations > 0
    assert result.successful_iterations + result.failed_iterations <= 50
    assert result.median is not None
    assert result.ci_2_5 is not None
    assert result.ci_97_5 is not None
