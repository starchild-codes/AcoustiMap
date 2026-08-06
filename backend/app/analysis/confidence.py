"""
Evidence consistency and confidence label calculation.

evidence_consistency =
    0.30 × feature_agreement
  + 0.20 × restored_recording_consistency
  + 0.15 × healthy_reference_adequacy
  + 0.15 × degraded_reference_adequacy
  + 0.10 × valid_recording_coverage
  + 0.10 × bootstrap_stability

Each component is normalised to 0–1.
"""

import numpy as np
from .schemas import ConfidenceResult, RecoveryScoreResult


def calculate_evidence_consistency(
    feature_agreement: float | None,
    restored_scores: list[RecoveryScoreResult],
    healthy_count: int,
    degraded_count: int,
    restored_count: int,
    total_recordings: int,
    excluded_count: int,
    bootstrap_std: float | None = None,
    bootstrap_available: bool = True,
    minimum_per_group: int = 3,
) -> ConfidenceResult:
    """
    Calculate evidence consistency and assign a confidence label.
    """
    components: dict[str, float | None] = {}
    reasons_increasing: list[str] = []
    reasons_reducing: list[str] = []
    unmet_next_level: list[str] = []

    # 1. Feature agreement (0-1)
    if feature_agreement is not None:
        # Average across restored recordings
        agreements = [s.feature_agreement for s in restored_scores if s.feature_agreement is not None]
        if agreements:
            fa = float(np.mean(agreements))
        else:
            fa = feature_agreement
        components["feature_agreement"] = fa
    else:
        components["feature_agreement"] = None

    # 2. Restored recording consistency (inverse of score std)
    valid_scores = [s.recovery_score for s in restored_scores if s.recovery_score is not None]
    if len(valid_scores) >= 2:
        mean_score = np.mean(valid_scores)
        if abs(mean_score) > 1e-10:
            cv = np.std(valid_scores) / abs(mean_score)
            consistency = float(np.clip(1 - cv, 0, 1))
        else:
            consistency = 0.5
    else:
        consistency = 0.3
    components["restored_recording_consistency"] = consistency

    # 3. Healthy reference adequacy
    h_adequacy = min(1.0, healthy_count / max(minimum_per_group * 2, 1))
    components["healthy_reference_adequacy"] = h_adequacy

    # 4. Degraded reference adequacy
    d_adequacy = min(1.0, degraded_count / max(minimum_per_group * 2, 1))
    components["degraded_reference_adequacy"] = d_adequacy

    # 5. Valid recording coverage
    if total_recordings > 0:
        coverage = 1 - (excluded_count / total_recordings)
    else:
        coverage = 0.0
    components["valid_recording_coverage"] = float(coverage)

    # 6. Bootstrap stability
    if bootstrap_available and bootstrap_std is not None:
        # Lower std = higher stability. Scale: std of 0 = 1.0, std of 20+ = 0.0
        stability = float(np.clip(1 - bootstrap_std / 20, 0, 1))
    elif not bootstrap_available:
        stability = None
    else:
        stability = 0.5
    components["bootstrap_stability"] = stability

    # Weighted sum
    weights = {
        "feature_agreement": 0.30,
        "restored_recording_consistency": 0.20,
        "healthy_reference_adequacy": 0.15,
        "degraded_reference_adequacy": 0.15,
        "valid_recording_coverage": 0.10,
        "bootstrap_stability": 0.10,
    }

    total_weight = 0.0
    weighted_sum = 0.0
    for key, weight in weights.items():
        val = components.get(key)
        if val is not None:
            weighted_sum += weight * val
            total_weight += weight
        else:
            reasons_reducing.append(f"{key} unavailable")

    evidence_consistency = weighted_sum / total_weight if total_weight > 0 else 0.0

    # Confidence label assignment
    confidence_label = "Insufficient evidence"
    confidence_reasons: list[str] = []

    if healthy_count < minimum_per_group:
        confidence_reasons.append(f"Only {healthy_count} healthy reference recordings (minimum {minimum_per_group} required).")
    if degraded_count < minimum_per_group:
        confidence_reasons.append(f"Only {degraded_count} degraded reference recordings (minimum {minimum_per_group} required).")
    if restored_count == 0:
        confidence_reasons.append("No valid restored recordings.")

    excluded_ratio = excluded_count / total_recordings if total_recordings > 0 else 0

    if healthy_count < minimum_per_group or degraded_count < minimum_per_group or restored_count == 0:
        confidence_label = "Insufficient evidence"
    elif evidence_consistency < 0.45:
        confidence_label = "Low"
        confidence_reasons.append(f"Evidence consistency ({evidence_consistency:.2f}) is below 0.45.")
    elif excluded_ratio > 0.3:
        confidence_label = "Low"
        confidence_reasons.append(f"{excluded_ratio*100:.0f}% of recordings excluded.")
    elif evidence_consistency < 0.70:
        confidence_label = "Moderate"
        if healthy_count >= minimum_per_group:
            reasons_increasing.append("Adequate healthy reference recordings.")
        if degraded_count >= minimum_per_group:
            reasons_increasing.append("Adequate degraded reference recordings.")
    elif evidence_consistency < 0.85:
        confidence_label = "Moderate–High"
        reasons_increasing.append("Good evidence consistency and coverage.")
        if healthy_count >= 5:
            reasons_increasing.append("At least 5 healthy reference recordings.")
        if degraded_count >= 5:
            reasons_increasing.append("At least 5 degraded reference recordings.")
    else:
        # High confidence — strict requirements
        confidence_label = "High"
        reasons_increasing.append("High evidence consistency.")
        if healthy_count >= 5:
            reasons_increasing.append("At least 5 healthy reference recordings.")
        else:
            unmet_next_level.append("Fewer than 5 healthy reference recordings.")
            confidence_label = "Moderate–High"
        if degraded_count >= 5:
            reasons_increasing.append("At least 5 degraded reference recordings.")
        else:
            unmet_next_level.append("Fewer than 5 degraded reference recordings.")
            confidence_label = "Moderate–High"
        if excluded_ratio >= 0.15:
            unmet_next_level.append(f"Exclusion rate ({excluded_ratio*100:.0f}%) is above 15%.")
            confidence_label = "Moderate–High"

    # Check feature count
    usable_features = len([s for s in restored_scores if s.feature_agreement is not None])
    if usable_features < 2:
        confidence_reasons.append("Fewer than 2 usable ecological features.")
        if confidence_label not in ("Insufficient evidence", "Low"):
            confidence_label = "Low"

    return ConfidenceResult(
        evidence_consistency=float(evidence_consistency),
        confidence_label=confidence_label,
        confidence_reasons=confidence_reasons,
        reasons_increasing=reasons_increasing,
        reasons_reducing=reasons_reducing,
        unmet_next_level=unmet_next_level,
        components={k: float(v) if v is not None else None for k, v in components.items()},
    )
