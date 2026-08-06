"""
Segment aggregation: combine segment-level features into recording-level results.

For each numeric feature, stores:
  mean, median, std, min, max, IQR, valid_segment_count, failed_segment_count

Uses the median as the default robust recording-level feature.
Does not average failed or missing values as zero.
"""

import numpy as np
from typing import Any
from .schemas import TechnicalFeatures, EcoacousticFeatures, QualityFlag, SegmentResult, RecordingResult


def _aggregate_numeric(values: list[float | None]) -> dict:
    """Aggregate a list of numeric values (None excluded)."""
    valid = [v for v in values if v is not None and np.isfinite(v)]
    if not valid:
        return {
            "mean": None, "median": None, "std": None,
            "min": None, "max": None, "iqr": None,
            "valid_count": 0,
        }
    arr = np.array(valid)
    q25, q75 = np.percentile(arr, [25, 75])
    return {
        "mean": float(np.mean(arr)),
        "median": float(np.median(arr)),
        "std": float(np.std(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "iqr": float(q75 - q25),
        "valid_count": len(valid),
    }


def aggregate_segments(
    segment_results: list[SegmentResult],
    recording_id: str,
    configuration_id: str = "",
    artifacts: dict[str, str] | None = None,
    input_checksum: str = "",
    runtime_seconds: float = 0.0,
) -> RecordingResult:
    """
    Aggregate segment-level results into a recording-level result.

    Uses the median as the primary recording-level value for each feature.
    Segments with fatal flags are excluded from aggregation.
    """
    # Filter to valid segments (no fatal flags)
    valid_segments = [
        s for s in segment_results
        if s.segment_info.is_valid and not any(f.severity == "fatal" for f in s.quality_flags)
    ]
    failed_segments = [s for s in segment_results if s not in valid_segments]

    if not valid_segments:
        # All segments failed — return a failed recording
        return RecordingResult(
            recording_id=recording_id,
            configuration_id=configuration_id,
            quality_status="failed",
            technical=TechnicalFeatures(),
            ecoacoustic=EcoacousticFeatures(),
            quality_flags=[],
            artifacts=artifacts or {},
            segment_results=segment_results,
            errors=["All segments failed quality checks."],
            warnings=[],
            valid_segment_count=0,
            failed_segment_count=len(segment_results),
            runtime_seconds=runtime_seconds,
            input_checksum=input_checksum,
        )

    # Aggregate technical features
    tech_fields = TechnicalFeatures.model_fields
    tech_values: dict[str, list[float | None]] = {f: [] for f in tech_fields}
    eco_fields = EcoacousticFeatures.model_fields
    eco_values: dict[str, list[float | None]] = {f: [] for f in eco_fields}

    for seg in valid_segments:
        for f in tech_fields:
            val = getattr(seg.technical, f, None)
            tech_values[f].append(val)
        for f in eco_fields:
            val = getattr(seg.ecoacoustic, f, None)
            if isinstance(val, dict):
                continue  # Skip dict fields like aci_by_band
            eco_values[f].append(val)

    # Build aggregated technical features (using median)
    tech_agg = {}
    for f, vals in tech_values.items():
        agg = _aggregate_numeric(vals)
        tech_agg[f] = agg["median"]

    # Build aggregated ecoacoustic features (using median)
    eco_agg = {}
    for f, vals in eco_values.items():
        agg = _aggregate_numeric(vals)
        eco_agg[f] = agg["median"]

    # Merge quality flags from all segments
    all_flags: list[QualityFlag] = []
    for seg in segment_results:
        all_flags.extend(seg.quality_flags)

    # Collect errors
    all_errors: list[str] = []
    for seg in segment_results:
        all_errors.extend(seg.errors)

    # Determine recording-level quality status
    fatal_count = sum(1 for f in all_flags if f.severity == "fatal")
    exclude_count = sum(1 for f in all_flags if f.severity == "exclude_recommended")
    review_count = sum(1 for f in all_flags if f.severity == "review")

    if fatal_count > 0:
        quality_status = "failed"
    elif exclude_count >= 2:
        quality_status = "exclude_recommended"
    elif exclude_count >= 1 or review_count >= 2:
        quality_status = "review"
    else:
        quality_status = "valid"

    technical = TechnicalFeatures(**tech_agg)
    ecoacoustic = EcoacousticFeatures(**{k: v for k, v in eco_agg.items() if k in EcoacousticFeatures.model_fields})

    return RecordingResult(
        recording_id=recording_id,
        configuration_id=configuration_id,
        quality_status=quality_status,
        technical=technical,
        ecoacoustic=ecoacoustic,
        quality_flags=all_flags,
        artifacts=artifacts or {},
        segment_results=segment_results,
        errors=all_errors,
        warnings=[],
        valid_segment_count=len(valid_segments),
        failed_segment_count=len(failed_segments),
        runtime_seconds=runtime_seconds,
        input_checksum=input_checksum,
    )


def build_modelling_matrix(
    recordings: list[RecordingResult],
    feature_names: list[str] | None = None,
) -> tuple[np.ndarray | None, list[str], list[str], list[str]]:
    """
    Build a modelling table with one row per valid recording.

    Returns:
        (matrix, feature_names, recording_ids, excluded_ids)
    """
    names = feature_names or [
        "aci", "bi", "spectral_entropy", "temporal_entropy",
        "biological_band_occupancy", "ndsi", "anthropogenic_noise_pressure",
    ]

    # Filter to valid and review recordings (not failed/excluded)
    valid_recordings = [r for r in recordings if r.quality_status in ("valid", "review")]
    excluded = [r.recording_id for r in recordings if r.quality_status not in ("valid", "review")]

    if not valid_recordings:
        return None, names, [], excluded

    # Check which features have any non-None values
    feature_availability = {f: False for f in names}
    rows = []
    rec_ids = []

    for rec in valid_recordings:
        row = []
        for f in names:
            val = getattr(rec.ecoacoustic, f, None)
            if val is not None:
                feature_availability[f] = True
            row.append(val)
        rows.append(row)
        rec_ids.append(rec.recording_id)

    # Drop features that are entirely None
    usable_features = [f for f in names if feature_availability[f]]
    dropped_features = [f for f in names if not feature_availability[f]]

    if not usable_features:
        return None, [], rec_ids, excluded

    # Build matrix, keeping only usable features
    col_indices = [names.index(f) for f in usable_features]
    matrix_list = []
    for row in rows:
        matrix_row = [row[i] for i in col_indices]
        # Check for None values in usable features
        if any(v is None for v in matrix_row):
            continue  # Skip recordings with missing usable features
        matrix_list.append([float(v) for v in matrix_row])

    if not matrix_list:
        return None, usable_features, rec_ids, excluded

    matrix = np.array(matrix_list, dtype=np.float64)

    # Detect zero-variance features
    variances = np.var(matrix, axis=0)
    zero_var_idx = [i for i, v in enumerate(variances) if v < 1e-10]
    if zero_var_idx:
        # Drop zero-variance features
        keep_idx = [i for i in range(matrix.shape[1]) if i not in zero_var_idx]
        matrix = matrix[:, keep_idx]
        usable_features = [usable_features[i] for i in keep_idx]
        dropped_features.extend([usable_features[i] for i in zero_var_idx] if zero_var_idx else [])

    return matrix, usable_features, rec_ids, excluded
