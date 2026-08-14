"""Tests for chronological, elapsed-time recovery momentum."""

import pytest

from app.analysis.temporal_analysis import calculate_temporal_analysis


def observation(score: float, date: str):
    return (score, f"{date}T06:00:00+00:00")


def test_periods_are_sorted_by_timestamp_not_label():
    result = calculate_temporal_analysis({
        "October": [observation(70, "2026-10-01")],
        "February": [observation(50, "2026-02-01")],
        "January": [observation(40, "2026-01-01")],
    }, bootstrap_iterations=10)
    assert [row["period"] for row in result["periods"]] == ["January", "February", "October"]
    assert result["direction"] == "Improving"


def test_irregular_intervals_use_elapsed_time():
    result = calculate_temporal_analysis({
        "p1": [observation(40, "2026-01-01")],
        "p2": [observation(41, "2026-02-01")],
        "p3": [observation(49, "2026-10-01")],
    }, bootstrap_iterations=0)
    assert result["sufficient"] is True
    assert result["elapsed_years"][2] > result["elapsed_years"][1] * 5
    assert result["slope_points_per_year"] == pytest.approx(12, abs=1.5)


def test_fewer_than_three_periods_has_no_direction():
    result = calculate_temporal_analysis({
        "p1": [observation(40, "2026-01-01")],
        "p2": [observation(50, "2026-02-01")],
    })
    assert result["sufficient"] is False
    assert "direction" not in result


def test_missing_dates_are_excluded_and_explained():
    result = calculate_temporal_analysis({
        "p1": [(40, None)],
        "p2": [observation(50, "2026-02-01")],
        "p3": [observation(60, "2026-03-01")],
    })
    assert result["sufficient"] is False
    assert "without a valid" in result["warnings"][0]


@pytest.mark.parametrize(
    ("scores", "expected"),
    [
        ([40, 50, 60], "Improving"),
        ([50, 50.05, 50.1], "Stable"),
        ([60, 50, 40], "Declining"),
    ],
)
def test_direction_labels(scores, expected):
    result = calculate_temporal_analysis({
        "p1": [observation(scores[0], "2024-01-01")],
        "p2": [observation(scores[1], "2025-01-01")],
        "p3": [observation(scores[2], "2026-01-01")],
    }, bootstrap_iterations=10)
    assert result["direction"] == expected


def test_bootstrap_is_deterministic_and_reports_counts():
    observations = {
        "p1": [observation(40, "2024-01-01"), observation(42, "2024-01-02")],
        "p2": [observation(50, "2025-01-01"), observation(52, "2025-01-02")],
        "p3": [observation(60, "2026-01-01"), observation(62, "2026-01-02")],
    }
    first = calculate_temporal_analysis(observations, bootstrap_iterations=25, random_seed=7)
    second = calculate_temporal_analysis(observations, bootstrap_iterations=25, random_seed=7)
    assert first["slope_ci_95_per_year"] == second["slope_ci_95_per_year"]
    assert first["bootstrap_requested_iterations"] == 25
    assert first["bootstrap_successful_iterations"] == 25
