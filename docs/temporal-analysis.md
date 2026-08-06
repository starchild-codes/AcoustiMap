# Temporal Analysis

## Recovery Momentum

Recovery momentum is calculated **only** when genuine monitoring-period metadata exist.

### Requirements

- At least **3** valid ordered monitoring periods
- Each period meets the minimum recording threshold
- Analysis configurations are compatible
- The same reference model or documented period-specific references are used

### Method

Uses the **Theil–Sen slope** (median of pairwise slopes) for robust trend estimation.

### Direction labels

| Slope range | Direction |
|-------------|----------|
| > 2 | Improving |
| > 0.5 | Weakly improving |
| -0.5 to 0.5 | Stable |
| < -0.5 | Weakly declining |
| < -2 | Declining |

### Insufficient data

When requirements are not met, the system shows:

> Insufficient longitudinal evidence to estimate recovery momentum.

No illustrative line is created when real project data exists.

## Output

- Slope per monitoring period
- Direction label
- Number of periods
- Fitted values
- Median score per period
- Recording counts per period
- Warnings

## What temporal analysis does NOT do

- Does not infer causation
- Does not predict future recovery
- Does not work without proper period metadata
- Does not create trends from file ordering or filenames
