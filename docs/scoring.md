# Scoring

## Recovery score formula

```
recovery_position = distance_from_degraded / (distance_from_degraded + distance_from_healthy)
recovery_score = recovery_position × 100
```

- **0** = recording is at the degraded reference
- **50** = recording is equidistant between degraded and healthy
- **100** = recording is at the healthy reference

## Distance metric

Default: Euclidean distance between scaled feature vectors and category centroids.

## Scaling methods

| Method | Description |
|--------|-------------|
| standard | StandardScaler: (x - mean) / std |
| robust | RobustScaler: (x - median) / IQR |
| none | No scaling |

Default: standard

## Features used

Default feature set:
- aci, bi, spectral_entropy, temporal_entropy
- frequency_band_occupancy, acoustic_diversity_index
- acoustic_evenness_index, ndsi

## Safeguards

| Condition | Action |
|-----------|--------|
| Zero denominator | Return neutral position 0.5 |
| Missing references | Return null score |
| < 3 recordings per category | Confidence = "Insufficient" |
| > 30% excluded | Confidence lowered |
| < 3 features | Confidence lowered |
| Near-zero variance features | Warning issued |

## Confidence labels

| Label | Criteria |
|-------|----------|
| Insufficient | < 3 recordings in any category |
| Low | Missing references or > 30% excluded |
| Moderate | Basic requirements met |
| Moderate–High | Good coverage, consistency > 0.8, ≥ 5 features |
| High | Never shown when criteria for Moderate–High are not met |

## Bootstrap procedure

1. For each iteration (default 100):
   - Resample within each habitat category with replacement
   - Recompute category centroids
   - Recompute recovery score
2. Return: median, mean, std, 2.5th percentile, 97.5th percentile

Label: "Bootstrap uncertainty under the current dataset and feature configuration"

## What the score does NOT mean

- It is not a biodiversity measure
- It does not imply causation
- It is not comparable between unrelated ecosystems without calibration
- It depends on the selected feature set and configuration
