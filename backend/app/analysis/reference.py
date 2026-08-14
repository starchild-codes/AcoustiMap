"""
Reference model, recovery score, confidence, and bootstrap uncertainty.

All calculations are transparent and documented. No random values are generated.
Uses scikit-learn for scaling and distance calculations.
"""

import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics.pairwise import euclidean_distances
from dataclasses import dataclass, field
from typing import Literal

import logging
logger = logging.getLogger(__name__)


@dataclass
class ReferenceModelResult:
    healthy_centroid: np.ndarray | None
    degraded_centroid: None
    restored_distances_healthy: list[float]
    restored_distances_degraded: list[float]
    healthy_similarity: list[float]
    degraded_similarity: list[float]
    recovery_positions: list[float]
    recovery_scores: list[float]
    feature_names: list[str]
    scaling_method: str
    warnings: list[str] = field(default_factory=list)
    included_count: int = 0
    excluded_count: int = 0


@dataclass
class ProjectSummaryResult:
    recovery_score: float | None
    healthy_similarity: float | None
    degraded_similarity: float | None
    improvement_over_degraded: float | None
    evidence_consistency: float | None
    confidence_label: str
    confidence_reasons: list[str]
    bootstrap_median: float | None = None
    bootstrap_mean: float | None = None
    bootstrap_std: float | None = None
    bootstrap_ci_low: float | None = None
    bootstrap_ci_high: float | None = None
    bootstrap_iterations: int = 0
    included_recording_ids: list[str] = field(default_factory=list)
    excluded_recording_ids: list[str] = field(default_factory=list)
    feature_names: list[str] = field(default_factory=list)
    scaling_method: str = "standard"
    warnings: list[str] = field(default_factory=list)


FEATURE_NAMES = [
    "aci", "biological_band_spectral_magnitude_ratio", "spectral_entropy", "temporal_entropy",
    "frequency_band_occupancy", "acoustic_diversity_index",
    "acoustic_evenness_index", "ndsi",
]


def extract_feature_vector(features: dict, feature_names: list[str] | None = None) -> np.ndarray | None:
    """Extract a feature vector from ecoacoustic features dict."""
    names = feature_names or FEATURE_NAMES
    vec = []
    for name in names:
        val = features.get(name)
        if val is None:
            return None
        vec.append(float(val))
    return np.array(vec) if vec else None


def compute_reference_model(
    healthy_features: list[dict],
    degraded_features: list[dict],
    restored_features: list[dict],
    restored_ids: list[str],
    scaling_method: str = "standard",
    feature_names: list[str] | None = None,
) -> ReferenceModelResult:
    """
    Build a reference model using category centroids and compute distances.

    Scaling: 'standard' (StandardScaler), 'robust' (RobustScaler), or 'none'.

    Distance metric: Euclidean distance between feature vectors and centroids.

    Recovery position:
        recovery_position = dist_to_degraded / (dist_to_degraded + dist_to_healthy)
        A value of 1.0 means the recording is at the healthy reference,
        0.0 means it is at the degraded reference.

    Recovery score (0-100):
        recovery_score = recovery_position * 100
    """
    names = feature_names or FEATURE_NAMES
    warnings: list[str] = []

    # Extract feature vectors
    healthy_vectors = [extract_feature_vector(f, names) for f in healthy_features]
    degraded_vectors = [extract_feature_vector(f, names) for f in degraded_features]
    restored_vectors = [extract_feature_vector(f, names) for f in restored_features]

    # Filter out None vectors
    healthy_vectors = [v for v in healthy_vectors if v is not None]
    degraded_vectors = [v for v in degraded_vectors if v is not None]
    restored_pairs = [(vid, v) for vid, v in zip(restored_ids, restored_vectors) if v is not None]
    restored_ids_valid = [p[0] for p in restored_pairs]
    restored_vectors_valid = [p[1] for p in restored_pairs]

    if len(healthy_vectors) == 0:
        warnings.append("No valid healthy reference recordings with complete features.")
    if len(degraded_vectors) == 0:
        warnings.append("No valid degraded reference recordings with complete features.")
    if len(restored_vectors_valid) == 0:
        warnings.append("No valid restored recordings with complete features.")

    if len(healthy_vectors) == 0 or len(degraded_vectors) == 0 or len(restored_vectors_valid) == 0:
        return ReferenceModelResult(
            healthy_centroid=None, degraded_centroid=None,
            restored_distances_healthy=[], restored_distances_degraded=[],
            healthy_similarity=[], degraded_similarity=[],
            recovery_positions=[], recovery_scores=[],
            feature_names=names, scaling_method=scaling_method,
            warnings=warnings, included_count=len(restored_vectors_valid),
            excluded_count=len(restored_ids) - len(restored_ids_valid),
        )

    # Check for zero-variance features
    all_vectors = np.array(healthy_vectors + degraded_vectors + restored_vectors_valid)
    variances = np.var(all_vectors, axis=0)
    zero_var_idx = [i for i, v in enumerate(variances) if v < 1e-10]
    if zero_var_idx:
        warnings.append(f"Features with near-zero variance detected at indices {zero_var_idx}. These may bias the result.")

    # Scaling
    if scaling_method == "standard":
        scaler = StandardScaler()
        all_scaled = scaler.fit_transform(all_vectors)
    elif scaling_method == "robust":
        scaler = RobustScaler()
        all_scaled = scaler.fit_transform(all_vectors)
    else:
        all_scaled = all_vectors

    n_healthy = len(healthy_vectors)
    n_degraded = len(degraded_vectors)

    healthy_scaled = all_scaled[:n_healthy]
    degraded_scaled = all_scaled[n_healthy:n_healthy + n_degraded]
    restored_scaled = all_scaled[n_healthy + n_degraded:]

    # Compute centroids
    healthy_centroid = np.mean(healthy_scaled, axis=0)
    degraded_centroid = np.mean(degraded_scaled, axis=0)

    # Compute distances
    restored_dist_healthy = euclidean_distances(restored_scaled, healthy_centroid.reshape(1, -1)).flatten()
    restored_dist_degraded = euclidean_distances(restored_scaled, degraded_centroid.reshape(1, -1)).flatten()

    # Recovery position: 0 = degraded, 1 = healthy
    recovery_positions = []
    recovery_scores = []
    healthy_sims = []
    degraded_sims = []

    for dh, dd in zip(restored_dist_healthy, restored_dist_degraded):
        total = dh + dd
        if total == 0:
            pos = 0.5
            warnings.append("Zero total distance encountered; using neutral position 0.5.")
        else:
            pos = dd / total

        recovery_positions.append(float(pos))
        recovery_scores.append(float(pos * 100))

        # Similarity: inverse of distance (normalized)
        max_dist = max(dh, dd, 1e-10)
        healthy_sims.append(float(1.0 - dh / max_dist) if max_dist > 0 else 0.5)
        degraded_sims.append(float(1.0 - dd / max_dist) if max_dist > 0 else 0.5)

    return ReferenceModelResult(
        healthy_centroid=healthy_centroid,
        degraded_centroid=degraded_centroid,
        restored_distances_healthy=restored_dist_healthy.tolist(),
        restored_distances_degraded=restored_dist_degraded.tolist(),
        healthy_similarity=healthy_sims,
        degraded_similarity=degraded_sims,
        recovery_positions=recovery_positions,
        recovery_scores=recovery_scores,
        feature_names=names,
        scaling_method=scaling_method,
        warnings=warnings,
        included_count=len(restored_vectors_valid),
        excluded_count=len(restored_ids) - len(restored_ids_valid),
    )


def compute_project_summary(
    model_result: ReferenceModelResult,
    healthy_count: int,
    degraded_count: int,
    restored_count: int,
    total_recordings: int,
    excluded_count: int,
    bootstrap_iterations: int = 0,
    bootstrap_data: tuple | None = None,
) -> ProjectSummaryResult:
    """
    Compute project-level summary including confidence and optional bootstrap.

    Confidence rules:
    - Insufficient: < 3 recordings in any required category
    - Low: missing references or > 30% excluded
    - Moderate: basic requirements met
    - Moderate-High: good coverage and consistency
    - High: never shown when < 3 recordings per category, > 30% excluded,
      or results depend on one feature
    """
    warnings = list(model_result.warnings)
    reasons: list[str] = []

    # Recovery score (mean of restored recording scores)
    recovery_score = None
    if model_result.recovery_scores:
        recovery_score = float(np.mean(model_result.recovery_scores))

    healthy_sim = float(np.mean(model_result.healthy_similarity)) if model_result.healthy_similarity else None
    degraded_sim = float(np.mean(model_result.degraded_similarity)) if model_result.degraded_similarity else None
    improvement = None
    if healthy_sim is not None and degraded_sim is not None:
        improvement = healthy_sim - degraded_sim

    # Evidence consistency: agreement across features
    consistency = _compute_evidence_consistency(model_result)

    # Confidence
    confidence_label = "Insufficient evidence"
    confidence_reasons: list[str] = []

    if healthy_count < 3:
        confidence_reasons.append(f"Only {healthy_count} healthy reference recordings (minimum 3 recommended).")
    if degraded_count < 3:
        confidence_reasons.append(f"Only {degraded_count} degraded reference recordings (minimum 3 recommended).")
    if restored_count < 3:
        confidence_reasons.append(f"Only {restored_count} restored recordings (minimum 3 recommended).")

    excluded_ratio = excluded_count / total_recordings if total_recordings > 0 else 0
    if excluded_ratio > 0.3:
        confidence_reasons.append(f"{excluded_ratio*100:.0f}% of recordings excluded, reducing confidence.")

    # Check feature dependence
    if model_result.feature_names and len(model_result.feature_names) < 3:
        confidence_reasons.append("Results depend on fewer than 3 features.")
        warnings.append("Results are sensitive to the selected feature set.")

    if healthy_count < 3 or degraded_count < 3 or restored_count < 3:
        confidence_label = "Insufficient evidence"
    elif excluded_ratio > 0.3:
        confidence_label = "Low"
    elif consistency is not None and consistency > 0.8 and len(model_result.feature_names) >= 5:
        confidence_label = "Moderate–High"
    elif consistency is not None and consistency > 0.6:
        confidence_label = "Moderate"
    else:
        confidence_label = "Low"

    # Bootstrap
    bs_median = bs_mean = bs_std = bs_ci_low = bs_ci_high = None
    bs_iterations = 0

    if bootstrap_iterations > 0 and bootstrap_data is not None:
        bs_scores, bs_failed = bootstrap_data
        if bs_scores:
            bs_median = float(np.median(bs_scores))
            bs_mean = float(np.mean(bs_scores))
            bs_std = float(np.std(bs_scores))
            bs_ci_low = float(np.percentile(bs_scores, 2.5))
            bs_ci_high = float(np.percentile(bs_scores, 97.5))
            bs_iterations = len(bs_scores)

            if bs_std is not None and bs_std > 10:
                confidence_reasons.append("Bootstrap estimates are highly unstable.")
                if confidence_label == "High":
                    confidence_label = "Moderate–High"

    return ProjectSummaryResult(
        recovery_score=recovery_score,
        healthy_similarity=healthy_sim,
        degraded_similarity=degraded_sim,
        improvement_over_degraded=improvement,
        evidence_consistency=consistency,
        confidence_label=confidence_label,
        confidence_reasons=confidence_reasons,
        bootstrap_median=bs_median,
        bootstrap_mean=bs_mean,
        bootstrap_std=bs_std,
        bootstrap_ci_low=bs_ci_low,
        bootstrap_ci_high=bs_ci_high,
        bootstrap_iterations=bs_iterations,
        included_recording_ids=[],  # filled by caller
        excluded_recording_ids=[],  # filled by caller
        feature_names=model_result.feature_names,
        scaling_method=model_result.scaling_method,
        warnings=warnings + confidence_reasons,
    )


def _compute_evidence_consistency(model_result: ReferenceModelResult) -> float | None:
    """
    Compute evidence consistency as the agreement across features.

    Uses the coefficient of variation of recovery positions across recordings.
    Lower variation = higher consistency.
    """
    if not model_result.recovery_positions:
        return None

    positions = np.array(model_result.recovery_positions)
    mean_pos = np.mean(positions)
    std_pos = np.std(positions)

    if mean_pos == 0:
        return None

    cv = std_pos / abs(mean_pos)
    # Convert to 0-1 scale: lower CV = higher consistency
    consistency = max(0, min(1, 1 - cv))
    return float(consistency)


def run_bootstrap(
    healthy_features: list[dict],
    degraded_features: list[dict],
    restored_features: list[dict],
    restored_ids: list[str],
    n_iterations: int = 100,
    random_seed: int = 42,
    scaling_method: str = "standard",
    feature_names: list[str] | None = None,
) -> tuple[list[float], int]:
    """
    Run bootstrap analysis by resampling within each habitat category.

    Returns: (list of bootstrap scores, number of failed iterations)
    """
    rng = np.random.RandomState(random_seed)
    scores: list[float] = []
    failed = 0

    for i in range(n_iterations):
        # Resample within each category with replacement
        h_idx = rng.randint(0, len(healthy_features), size=len(healthy_features)) if healthy_features else []
        d_idx = rng.randint(0, len(degraded_features), size=len(degraded_features)) if degraded_features else []
        r_idx = rng.randint(0, len(restored_features), size=len(restored_features)) if restored_features else []

        h_sample = [healthy_features[j] for j in h_idx]
        d_sample = [degraded_features[j] for j in d_idx]
        r_sample = [restored_features[j] for j in r_idx]
        r_ids = [restored_ids[j] for j in r_idx]

        try:
            model = compute_reference_model(h_sample, d_sample, r_sample, r_ids, scaling_method, feature_names)
            if model.recovery_scores:
                scores.append(float(np.mean(model.recovery_scores)))
            else:
                failed += 1
        except Exception:
            failed += 1

    return scores, failed
