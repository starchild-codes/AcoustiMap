# Temporal Analysis

## Recovery Momentum

Recovery momentum is calculated **only** when genuine monitoring-period metadata exist.

### Requirements

- At least **3** valid ordered monitoring periods
- Each period meets the minimum recording threshold
- Analysis configurations are compatible
- The same reference model or documented period-specific references are used

### Method

Uses the **Theil–Sen slope** (median of pairwise slopes) against actual elapsed years. Periods are ordered by valid recording timestamps, not labels; each period uses its median valid recording timestamp.

### Direction labels

| Slope in recovery-score points/year | Direction |
|-------------|----------|
| > 5 | Improving |
| > 1 | Weakly improving |
| -1 to 1 | Stable |
| < -1 | Weakly declining |
| < -5 | Declining |

These are configurable prototype defaults, not externally calibrated ecological thresholds. A within-period bootstrap reports an internal 95% slope interval when sufficient dated data exist.

### Insufficient data

When requirements are not met, the system shows:

> Insufficient longitudinal evidence to estimate recovery momentum.

No illustrative line is created when real project data exists.

## Output

- Slope per year and per month using actual elapsed dates
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
