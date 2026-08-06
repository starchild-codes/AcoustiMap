# Bootstrap Uncertainty

## Procedure

For each iteration:
1. Sample healthy recordings **with replacement** (stratified)
2. Sample degraded recordings **with replacement**
3. Sample restored recordings **with replacement**
4. Refit the scaler using bootstrapped reference recordings
5. Recalculate reference centroids
6. Recalculate restored recording scores
7. Aggregate to project level (median)

## Output

- Mean, median, standard deviation
- 2.5th, 25th, 75th, 97.5th percentiles
- Successful and failed iteration counts
- Random seed used

## Label

**Bootstrap uncertainty under the current recordings, labels, features, and analysis settings**

This is NOT a causal confidence interval.

## Reproducibility

Fixed random seed ensures reproducible results. The same data and configuration will always produce the same bootstrap output.

## Options

| Iterations | Use case |
|------------|----------|
| 100 | Fast testing |
| 500 | Default prototype setting |
| 1000 | Higher precision (slower) |
