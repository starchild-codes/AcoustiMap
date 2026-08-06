# Reference Model

## Overview

The reference model positions restored recordings relative to healthy and degraded reference profiles using scaled feature vectors and distance metrics.

## Scaling

The scaler is fitted using **reference recordings only** (healthy + degraded). Restored recordings are never used to fit scaling parameters.

| Method | Description |
|--------|-------------|
| robust (default) | RobustScaler: (x - median) / IQR |
| standard | StandardScaler: (x - mean) / std |
| none | No scaling |

Zero-scale features are dropped with a warning.

## Centroids

Centroids are computed as the **median** feature vector across recordings in each category, for robustness against outliers.

## Distance metrics

| Metric | Description |
|--------|-------------|
| euclidean (default) | Straight-line distance in scaled feature space |
| cosine | 1 - cosine similarity |

## Minimum requirements

- At least `minimum_recordings_per_reference_group` (default: 3) valid recordings in each reference group
- At least 1 valid restored recording
- At least 2 usable ecological features

If requirements are not met, the system returns "Insufficient reference data" and does not calculate a recovery score.
