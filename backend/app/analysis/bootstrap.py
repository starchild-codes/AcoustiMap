"""
Stratified bootstrap resampling for uncertainty estimation.

For each iteration:
1. Sample healthy recordings with replacement
2. Sample degraded recordings with replacement
3. Sample restored recordings with replacement
4. Refit scaler using bootstrapped reference recordings
5. Recalculate reference centroids
6. Recalculate restored scores
7. Aggregate to project level

Label: "Bootstrap uncertainty under the current recordings, labels, features, and analysis settings"
"""

import numpy as np
import logging
from .schemas import BootstrapResult
from .reference_model import build_reference_model, extract_feature_vector
from .recovery_score import calculate_recovery_scores, aggregate_scores

logger = logging.getLogger(__name__)


def run_bootstrap(
    healthy_features: list[dict],
    degraded_features: list[dict],
    restored_features: list[dict],
    healthy_ids: list[str],
    degraded_ids: list[str],
    restored_ids: list[str],
    feature_names: list[str],
    n_iterations: int = 500,
    random_seed: int = 42,
    scaling_method: str = "robust",
    distance_metric: str = "euclidean",
    minimum_per_group: int = 3,
) -> BootstrapResult:
    """
    Run stratified bootstrap analysis.

    Returns BootstrapResult with median, mean, std, and percentiles.
    """
    rng = np.random.RandomState(random_seed)
    scores: list[float] = []
    failed = 0

    for i in range(n_iterations):
        # Resample within each category with replacement
        h_idx = rng.randint(0, len(healthy_features), size=len(healthy_features))
        d_idx = rng.randint(0, len(degraded_features), size=len(degraded_features))
        r_idx = rng.randint(0, len(restored_features), size=len(restored_features))

        h_sample = [healthy_features[j] for j in h_idx]
        d_sample = [degraded_features[j] for j in d_idx]
        r_sample = [restored_features[j] for j in r_idx]
        h_ids = [healthy_ids[j] for j in h_idx]
        d_ids = [degraded_ids[j] for j in d_idx]
        r_ids = [restored_ids[j] for j in r_idx]

        try:
            model = build_reference_model(
                h_sample, d_sample, r_sample,
                h_ids, d_ids, r_ids,
                feature_names, scaling_method, distance_metric,
                minimum_per_group,
            )
            rec_scores = calculate_recovery_scores(
                model, r_sample, r_ids, feature_names, distance_metric
            )
            agg = aggregate_scores(rec_scores)
            if agg["median"] is not None:
                scores.append(agg["median"])
            else:
                failed += 1
        except Exception as e:
            logger.debug("Bootstrap iteration %d failed: %s", i, e)
            failed += 1

    if not scores:
        return BootstrapResult(
            requested_iterations=n_iterations,
            successful_iterations=0,
            failed_iterations=failed,
            random_seed=random_seed,
        )

    arr = np.array(scores)

    return BootstrapResult(
        requested_iterations=n_iterations,
        successful_iterations=len(scores),
        failed_iterations=failed,
        mean=float(np.mean(arr)),
        median=float(np.median(arr)),
        std=float(np.std(arr)),
        ci_2_5=float(np.percentile(arr, 2.5)),
        ci_25=float(np.percentile(arr, 25)),
        ci_75=float(np.percentile(arr, 75)),
        ci_97_5=float(np.percentile(arr, 97.5)),
        random_seed=random_seed,
    )
