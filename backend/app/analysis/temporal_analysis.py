"""
Temporal analysis: recovery momentum across monitoring periods.

Uses Theil–Sen slope for robust trend estimation.
Only calculates momentum when sufficient longitudinal data exist.
"""

import numpy as np
from typing import Any
import logging

logger = logging.getLogger(__name__)


def theil_sen_slope(x: np.ndarray, y: np.ndarray) -> tuple[float | None, float | None]:
    """
    Compute the Theil–Sen slope (median of pairwise slopes).

    Returns: (slope, intercept) or (None, None) if insufficient data.
    """
    n = len(x)
    if n < 3:
        return None, None

    slopes = []
    for i in range(n):
        for j in range(i + 1, n):
            dx = x[j] - x[i]
            if dx != 0:
                slopes.append((y[j] - y[i]) / dx)

    if not slopes:
        return None, None

    slope = float(np.median(slopes))
    intercept = float(np.median(y) - slope * np.median(x))
    return slope, intercept


def calculate_temporal_analysis(
    period_scores: dict[str, list[float]],
    period_order: list[str],
    min_periods: int = 3,
    min_recordings_per_period: int = 1,
) -> dict[str, Any] | None:
    """
    Calculate recovery momentum across monitoring periods.

    Args:
        period_scores: Dict of period name → list of recovery scores.
        period_order: Ordered list of period names.
        min_periods: Minimum number of valid periods required.
        min_recordings_per_period: Minimum recordings per period.

    Returns:
        Temporal analysis dict or None if insufficient data.
    """
    # Filter to periods with data, in the specified order
    valid_periods = []
    valid_scores = []
    valid_counts = []

    for period in period_order:
        scores = period_scores.get(period, [])
        if len(scores) >= min_recordings_per_period:
            valid_periods.append(period)
            valid_scores.append(float(np.median(scores)))
            valid_counts.append(len(scores))

    if len(valid_periods) < min_periods:
        return {
            "sufficient": False,
            "message": "Insufficient longitudinal evidence to estimate recovery momentum.",
            "valid_periods": len(valid_periods),
            "required_periods": min_periods,
        }

    x = np.arange(len(valid_periods), dtype=float)
    y = np.array(valid_scores)

    slope, intercept = theil_sen_slope(x, y)

    if slope is None:
        return {
            "sufficient": False,
            "message": "Could not compute trend slope.",
            "valid_periods": len(valid_periods),
        }

    # Direction labels
    if slope > 2:
        direction = "Improving"
    elif slope > 0.5:
        direction = "Weakly improving"
    elif slope > -0.5:
        direction = "Stable"
    elif slope > -2:
        direction = "Weakly declining"
    else:
        direction = "Declining"

    # Fitted values
    fitted = [float(slope * xi + intercept) for xi in x]

    return {
        "sufficient": True,
        "direction": direction,
        "slope": slope,
        "intercept": intercept,
        "num_periods": len(valid_periods),
        "periods": valid_periods,
        "median_scores": valid_scores,
        "recording_counts": valid_counts,
        "fitted_values": fitted,
        "message": f"Recovery momentum: {direction} (slope = {slope:.2f} points per period).",
        "warning": "Theil–Sen slope is a robust trend estimate, not a causal inference.",
    }
