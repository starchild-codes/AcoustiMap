# Quality Control

## Flag codes

| Code | Severity | Trigger | Action |
|------|----------|---------|--------|
| DECODE_FAILED | fatal | Audio file cannot be decoded | Exclude |
| EMPTY_AUDIO | fatal | Zero samples in file | Exclude |
| TOO_SHORT | review | Duration < minimum (default 5s) | Review |
| NEAR_SILENCE | exclude_recommended | RMS < silence threshold (default -50 dBFS) | Consider excluding |
| HIGH_SILENCE_PROPORTION | review | Silence frames > 50% | Review |
| EXCESSIVE_CLIPPING | exclude_recommended | Clipping proportion > 0.1% | Consider excluding |
| LOW_FREQUENCY_DOMINANCE | review | Low-freq energy > 65% | Review for noise |
| UNUSUAL_SAMPLE_RATE | info | Non-standard sample rate | No action needed |
| MISSING_TIMESTAMP | info | No timestamp recorded | Add timestamp |
| MISSING_SITE | info | No site assigned | Assign site |
| ECOACOUSTIC_METRIC_FAILED | review | One or more indices failed | Review log |
| INSUFFICIENT_VALID_SEGMENTS | review | No valid segments | Review |

## Suggested status

| Condition | Suggested status |
|-----------|----------------|
| Any fatal flag | failed |
| ≥ 2 exclude_recommended flags | exclude_recommended |
| ≥ 1 exclude_recommended or ≥ 1 review flag | review |
| Otherwise | valid |

The system **never** automatically excludes recordings. The user makes the final decision.

## Silence detection

Uses short-time RMS frames (20ms) with a configurable dBFS threshold.
A frame is silent when its RMS falls below `10^(threshold_dbfs / 20)`.

## Clipping detection

A sample is near-clipping when `abs(sample) >= clipping_amplitude_threshold` (default 0.99).

**Note:** For compressed formats (MP3, M4A), this is sample-level near-clipping detection only.
It does not guarantee the original recording was unclipped.
