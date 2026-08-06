"""
Reference model: scaling, centroid construction, and distance calculations.

Fits scaler using reference recordings (healthy + degraded) only.
Does not fit scaling parameters using restored recordings.
"""

import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics.pairwise import euclidean_distances, cosine_distances
from dataclasses import dataclass, field
import logging

from .exceptions import InsufficientReferenceDataError

logger = logging.getLogger(__name__)


@dataclass
class ReferenceModel:
    """Result of building the reference model."""
    healthy_centroid: np.ndarray | None
    degraded_centroid: np.ndarray | None
    healthy_recording_ids: list[str]
    degraded_recording_ids: list[str]
    restored_recording_ids: list[str]
    feature_names: list[str]
    scaling_method: str
    scaler: StandardScaler | RobustScaler | None = None
    scaler_fitted_ids: list[str] = field(default_factory=list)
    dropped_features: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    healthy_dispersion: list[float] = field(default_factory=list)
    degraded_dispersion: list[float] = field(default_factory=list)


def extract_feature_vector(features: dict, feature_names: list[str]) -> np.ndarray | None:
    """Extract a feature vector from an ecoacoustic features dict."""
    vec = []
    for name in feature_names:
        val = features.get(name)
        if val is None:
            return None
        vec.append(float(val))
    return np.array(vec) if vec else None


def fit_scaler(
    reference_matrix: np.ndarray,
    method: str = "robust",
) -> tuple[StandardScaler | RobustScaler | None, np.ndarray]:
    """
    Fit a scaler using reference recordings only.

    Returns: (scaler, scaled_matrix)
    """
    if method == "none":
        return None, reference_matrix

    if method == "standard":
        scaler = StandardScaler()
    elif method == "robust":
        scaler = RobustScaler()
    else:
        raise ValueError(f"Unknown scaling method: {method}")

    scaled = scaler.fit_transform(reference_matrix)

    # Check for zero-scale features
    if hasattr(scaler, 'scale_'):
        zero_scale_idx = [i for i, s in enumerate(scaler.scale_) if s < 1e-10]
        if zero_scale_idx:
            logger.warning("Zero-scale features detected at indices %s. These will be dropped.", zero_scale_idx)

    return scaler, scaled


def build_reference_model(
    healthy_features: list[dict],
    degraded_features: list[dict],
    restored_features: list[dict],
    healthy_ids: list[str],
    degraded_ids: list[str],
    restored_ids: list[str],
    feature_names: list[str],
    scaling_method: str = "robust",
    distance_metric: str = "euclidean",
    minimum_recordings_per_group: int = 3,
) -> ReferenceModel:
    """
    Construct healthy and degraded reference profiles.

    Uses the median feature vector as the centroid for robustness.
    Fits scaler using reference recordings only.

    Raises InsufficientReferenceDataError if too few recordings.
    """
    warnings: list[str] = []

    # Check minimum group sizes
    if len(healthy_features) < minimum_recordings_per_group:
        raise InsufficientReferenceDataError(
            f"Insufficient healthy reference recordings: {len(healthy_features)} found, "
            f"at least {minimum_recordings_per_group} required."
        )
    if len(degraded_features) < minimum_recordings_per_group:
        raise InsufficientReferenceDataError(
            f"Insufficient degraded reference recordings: {len(degraded_features)} found, "
            f"at least {minimum_recordings_per_group} required."
        )
    if len(restored_features) == 0:
        raise InsufficientReferenceDataError("No valid restored recordings.")

    # Extract feature vectors
    healthy_vectors = [extract_feature_vector(f, feature_names) for f in healthy_features]
    degraded_vectors = [extract_feature_vector(f, feature_names) for f in degraded_features]
    restored_vectors = [extract_feature_vector(f, feature_names) for f in restored_features]

    # Filter None vectors
    healthy_valid = [(i, v) for i, v in zip(healthy_ids, healthy_vectors) if v is not None]
    degraded_valid = [(i, v) for i, v in zip(degraded_ids, degraded_vectors) if v is not None]
    restored_valid = [(i, v) for i, v in zip(restored_ids, restored_vectors) if v is not None]

    if len(healthy_valid) < minimum_recordings_per_group:
        raise InsufficientReferenceDataError(
            f"Insufficient valid healthy recordings with complete features: {len(healthy_valid)}."
        )
    if len(degraded_valid) < minimum_recordings_per_group:
        raise InsufficientReferenceDataError(
            f"Insufficient valid degraded recordings with complete features: {len(degraded_valid)}."
        )
    if not restored_valid:
        raise InsufficientReferenceDataError("No valid restored recordings with complete features.")

    healthy_ids_valid = [p[0] for p in healthy_valid]
    degraded_ids_valid = [p[0] for p in degraded_valid]
    restored_ids_valid = [p[0] for p in restored_valid]

    healthy_matrix = np.array([p[1] for p in healthy_valid])
    degraded_matrix = np.array([p[1] for p in degraded_valid])
    restored_matrix = np.array([p[1] for p in restored_valid])

    # Fit scaler using reference recordings only
    reference_matrix = np.vstack([healthy_matrix, degraded_matrix])
    scaler, reference_scaled = fit_scaler(reference_matrix, scaling_method)
    scaler_fitted_ids = healthy_ids_valid + degraded_ids_valid

    # Apply scaler to restored recordings
    if scaler is not None:
        restored_scaled = scaler.transform(restored_matrix)
        healthy_scaled = reference_scaled[:len(healthy_valid)]
        degraded_scaled = reference_scaled[len(healthy_valid):]
    else:
        restored_scaled = restored_matrix
        healthy_scaled = healthy_matrix
        degraded_scaled = degraded_matrix

    # Compute centroids (median for robustness)
    healthy_centroid = np.median(healthy_scaled, axis=0)
    degraded_centroid = np.median(degraded_scaled, axis=0)

    # Per-feature dispersion (IQR)
    healthy_dispersion = []
    degraded_dispersion = []
    for i in range(healthy_scaled.shape[1]):
        h_q25, h_q75 = np.percentile(healthy_scaled[:, i], [25, 75])
        d_q25, d_q75 = np.percentile(degraded_scaled[:, i], [25, 75])
        healthy_dispersion.append(float(h_q75 - h_q25))
        degraded_dispersion.append(float(d_q75 - d_q25))

    # Check for identical centroids
    if np.allclose(healthy_centroid, degraded_centroid, atol=1e-10):
        warnings.append("Healthy and degraded centroids are effectively identical. Recovery score will be unreliable.")

    # Check for zero-variance features
    all_ref = np.vstack([healthy_scaled, degraded_scaled])
    variances = np.var(all_ref, axis=0)
    zero_var = [feature_names[i] for i, v in enumerate(variances) if v < 1e-10]
    if zero_var:
        warnings.append(f"Zero-variance features detected: {zero_var}. These may bias results.")

    return ReferenceModel(
        healthy_centroid=healthy_centroid,
        degraded_centroid=degraded_centroid,
        healthy_recording_ids=healthy_ids_valid,
        degraded_recording_ids=degraded_ids_valid,
        restored_recording_ids=restored_ids_valid,
        feature_names=feature_names,
        scaling_method=scaling_method,
        scaler=scaler,
        scaler_fitted_ids=scaler_fitted_ids,
        dropped_features=[],
        warnings=warnings,
        healthy_dispersion=healthy_dispersion,
        degraded_dispersion=degraded_dispersion,
    )


def compute_distances(
    restored_scaled: np.ndarray,
    healthy_centroid: np.ndarray,
    degraded_centroid: np.ndarray,
    distance_metric: str = "euclidean",
) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute distances from each restored recording to each reference centroid.

    Returns: (distances_to_healthy, distances_to_degraded)
    """
    h = healthy_centroid.reshape(1, -1)
    d = degraded_centroid.reshape(1, -1)

    if distance_metric == "cosine":
        # Handle zero vectors
        dist_h = cosine_distances(restored_scaled, h).flatten()
        dist_d = cosine_distances(restored_scaled, d).flatten()
    else:
        # Euclidean (default)
        dist_h = euclidean_distances(restored_scaled, h).flatten()
        dist_d = euclidean_distances(restored_scaled, d).flatten()

    return dist_h, dist_d
