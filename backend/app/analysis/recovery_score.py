"""
Recovery score: distance-based and projection-based positioning.

Distance-based:
    recovery_position = dist_to_degraded / (dist_to_degraded + dist_to_healthy)
    recovery_score = 100 × recovery_position

Projection-based:
    projection = ((x - d) · (h - d)) / ||h - d||²
    display_projection = clamp(projection × 100, 0, 100)

Also computes feature-level agreement.
"""

import numpy as np
from .schemas import RecoveryScoreResult
from .reference_model import ReferenceModel, compute_distances, extract_feature_vector


def calculate_recovery_scores(
    model: ReferenceModel,
    restored_features: list[dict],
    restored_ids: list[str],
    feature_names: list[str],
    distance_metric: str = "euclidean",
) -> list[RecoveryScoreResult]:
    """
    Calculate recovery scores for restored recordings.

    Returns a list of RecoveryScoreResult, one per restored recording.
    """
    results: list[RecoveryScoreResult] = []

    if model.healthy_centroid is None or model.degraded_centroid is None:
        for rid in restored_ids:
            results.append(RecoveryScoreResult(recording_id=rid))
        return results

    # Extract and scale restored feature vectors
    restored_vectors = []
    valid_ids = []
    for rid, feat in zip(restored_ids, restored_features):
        vec = extract_feature_vector(feat, feature_names)
        if vec is not None:
            restored_vectors.append(vec)
            valid_ids.append(rid)

    if not restored_vectors:
        return [RecoveryScoreResult(recording_id=rid) for rid in restored_ids]

    restored_matrix = np.array(restored_vectors)

    # Apply scaler
    if model.scaler is not None:
        restored_scaled = model.scaler.transform(restored_matrix)
    else:
        restored_scaled = restored_matrix

    # Compute distances
    dist_h, dist_d = compute_distances(
        restored_scaled, model.healthy_centroid, model.degraded_centroid, distance_metric
    )

    # Compute projection onto degraded-to-healthy axis
    d = model.degraded_centroid
    h = model.healthy_centroid
    axis = h - d
    axis_norm_sq = np.dot(axis, axis)

    for i, rid in enumerate(valid_ids):
        x = restored_scaled[i]

        # Distance-based recovery position
        total_dist = dist_h[i] + dist_d[i]
        if total_dist == 0:
            recovery_position = 0.5
        else:
            recovery_position = float(dist_d[i] / total_dist)

        recovery_score = float(np.clip(recovery_position * 100, 0, 100))

        # Projection-based score
        if axis_norm_sq > 0:
            projection_raw = float(np.dot(x - d, axis) / axis_norm_sq)
            projection_display = float(np.clip(projection_raw * 100, 0, 100))
        else:
            projection_raw = None
            projection_display = None

        # Feature-level agreement
        supporting = 0
        opposing = 0
        unavailable = 0
        feature_details = []

        for j, fname in enumerate(feature_names):
            x_val = x[j]
            h_val = h[j]
            d_val = d[j]

            dist_to_h = abs(x_val - h_val)
            dist_to_d = abs(x_val - d_val)

            if dist_to_h < dist_to_d:
                supporting += 1
                direction = "toward_healthy"
            elif dist_to_d < dist_to_h:
                opposing += 1
                direction = "toward_degraded"
            else:
                unavailable += 1
                direction = "neutral"

            feature_details.append({
                "feature": fname,
                "direction": direction,
                "dist_to_healthy": float(dist_to_h),
                "dist_to_degraded": float(dist_to_d),
            })

        usable = supporting + opposing
        feature_agreement = float(supporting / usable) if usable > 0 else None

        results.append(RecoveryScoreResult(
            recording_id=rid,
            distance_to_healthy=float(dist_h[i]),
            distance_to_degraded=float(dist_d[i]),
            recovery_position=recovery_position,
            recovery_score=recovery_score,
            projection_score=projection_display,
            projection_raw=projection_raw,
            feature_agreement=feature_agreement,
            supporting_features=supporting,
            opposing_features=opposing,
            unavailable_features=unavailable,
            feature_details=feature_details,
        ))

    return results


def aggregate_scores(scores: list[RecoveryScoreResult]) -> dict:
    """
    Aggregate recording-level scores to project/site level.

    Uses median as the primary summary.
    """
    valid_scores = [s.recovery_score for s in scores if s.recovery_score is not None]
    if not valid_scores:
        return {
            "median": None, "mean": None, "std": None,
            "iqr": None, "min": None, "max": None,
            "count": 0,
        }

    arr = np.array(valid_scores)
    q25, q75 = np.percentile(arr, [25, 75])
    return {
        "median": float(np.median(arr)),
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr)),
        "iqr": float(q75 - q25),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "count": len(valid_scores),
    }
