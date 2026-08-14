"""Chronological recovery momentum using robust elapsed-time slopes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np

DAYS_PER_YEAR = 365.2425


def theil_sen_slope(x: np.ndarray, y: np.ndarray) -> tuple[float | None, float | None]:
    """Return the median pairwise slope and a median-based intercept."""
    if len(x) < 3 or len(y) != len(x):
        return None, None
    slopes = [
        (y[j] - y[i]) / (x[j] - x[i])
        for i in range(len(x))
        for j in range(i + 1, len(x))
        if x[j] != x[i]
    ]
    if not slopes:
        return None, None
    slope = float(np.median(slopes))
    intercept = float(np.median(y - slope * x))
    return slope, intercept


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def _direction(slope: float, stable: float, strong: float) -> str:
    if slope > strong:
        return "Improving"
    if slope > stable:
        return "Weakly improving"
    if slope < -strong:
        return "Declining"
    if slope < -stable:
        return "Weakly declining"
    return "Stable"


def calculate_temporal_analysis(
    period_observations: dict[str, list[tuple[float, str | None]]],
    min_periods: int = 3,
    min_recordings_per_period: int = 1,
    stable_threshold_per_year: float = 1.0,
    strong_threshold_per_year: float = 5.0,
    bootstrap_iterations: int = 500,
    random_seed: int = 42,
) -> dict[str, Any]:
    """Estimate momentum from dated period medians.

    Each period is positioned at the median valid recording timestamp. Periods
    are sorted by that timestamp and the Theil–Sen slope is calculated against
    actual elapsed years, so irregular sampling intervals are retained.
    """
    period_rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    missing_date_count = 0

    for period, observations in period_observations.items():
        valid = [(float(score), _parse_timestamp(timestamp)) for score, timestamp in observations]
        missing_date_count += sum(timestamp is None for _, timestamp in valid)
        dated = [(score, timestamp) for score, timestamp in valid if timestamp is not None]
        if len(dated) < min_recordings_per_period:
            continue
        timestamps = np.array([timestamp.timestamp() for _, timestamp in dated], dtype=float)
        representative = datetime.fromtimestamp(float(np.median(timestamps)), tz=timezone.utc)
        period_rows.append({
            "period": period,
            "date": representative.isoformat(),
            "timestamp": representative.timestamp(),
            "scores": [score for score, _ in dated],
            "recording_count": len(dated),
            "median_score": float(np.median([score for score, _ in dated])),
        })

    period_rows.sort(key=lambda row: row["timestamp"])
    if missing_date_count:
        warnings.append(f"{missing_date_count} restoration score(s) without a valid timezone-aware timestamp were excluded from temporal analysis.")

    public_periods = [
        {
            "period": row["period"],
            "date": row["date"],
            "recording_count": row["recording_count"],
            "median_score": row["median_score"],
        }
        for row in period_rows
    ]
    if len(period_rows) < min_periods:
        return {
            "sufficient": False,
            "message": "Insufficient longitudinal evidence to estimate recovery momentum.",
            "valid_periods": len(period_rows),
            "required_periods": min_periods,
            "periods": public_periods,
            "warnings": warnings,
        }

    first_timestamp = period_rows[0]["timestamp"]
    elapsed_years = np.array(
        [(row["timestamp"] - first_timestamp) / 86400.0 / DAYS_PER_YEAR for row in period_rows],
        dtype=float,
    )
    median_scores = np.array([row["median_score"] for row in period_rows], dtype=float)
    slope, intercept = theil_sen_slope(elapsed_years, median_scores)
    if slope is None or intercept is None:
        return {
            "sufficient": False,
            "message": "Valid monitoring periods do not span enough distinct dates to estimate momentum.",
            "valid_periods": len(period_rows),
            "required_periods": min_periods,
            "periods": public_periods,
            "warnings": warnings,
        }

    rng = np.random.default_rng(random_seed)
    bootstrap_slopes: list[float] = []
    for _ in range(bootstrap_iterations):
        resampled_medians = np.array([
            float(np.median(rng.choice(row["scores"], size=len(row["scores"]), replace=True)))
            for row in period_rows
        ])
        bootstrap_slope, _ = theil_sen_slope(elapsed_years, resampled_medians)
        if bootstrap_slope is not None and np.isfinite(bootstrap_slope):
            bootstrap_slopes.append(float(bootstrap_slope))

    ci_low = float(np.percentile(bootstrap_slopes, 2.5)) if bootstrap_slopes else None
    ci_high = float(np.percentile(bootstrap_slopes, 97.5)) if bootstrap_slopes else None
    direction = _direction(slope, stable_threshold_per_year, strong_threshold_per_year)
    fitted = [float(slope * elapsed + intercept) for elapsed in elapsed_years]

    return {
        "sufficient": True,
        "direction": direction,
        "slope_points_per_year": slope,
        "slope_points_per_month": slope / 12.0,
        "slope_ci_95_per_year": [ci_low, ci_high] if ci_low is not None else None,
        "intercept": intercept,
        "num_periods": len(period_rows),
        "periods": public_periods,
        "elapsed_years": elapsed_years.tolist(),
        "fitted_values": fitted,
        "bootstrap_requested_iterations": bootstrap_iterations,
        "bootstrap_successful_iterations": len(bootstrap_slopes),
        "random_seed": random_seed,
        "direction_thresholds_points_per_year": {
            "stable_absolute_max": stable_threshold_per_year,
            "strong_direction_min": strong_threshold_per_year,
            "status": "configurable prototype defaults; not externally calibrated",
        },
        "message": f"Recovery momentum: {direction} ({slope:.2f} recovery-score points per year).",
        "warnings": warnings + ["Theil–Sen slope and its internal bootstrap interval are acoustic trend evidence, not causal inference."],
    }
