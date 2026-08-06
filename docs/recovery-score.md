# Recovery Score

## Formula

### Distance-based (primary)

```
recovery_position = distance_to_degraded / (distance_to_degraded + distance_to_healthy)
recovery_score = 100 × recovery_position
```

- **0** = at degraded reference
- **50** = equidistant between references
- **100** = at healthy reference

### Projection-based (sensitivity)

```
projection = ((x - d) · (h - d)) / ||h - d||²
display_projection = clamp(projection × 100, 0, 100)
```

- Raw projection < 0: beyond degraded centroid
- Raw projection > 1: beyond healthy centroid

The system stores both and warns when they disagree substantially.

## Safeguards

| Condition | Action |
|-----------|--------|
| Zero denominator | Return neutral position 0.5 |
| Missing references | Return null score |
| Failed quality checks | Exclude from scoring |
| Missing features | Exclude recording from model |

## What the score does NOT mean

- Not a biodiversity measure
- Not a percentage of recovery
- Not comparable across unrelated ecosystems
- Not a causal claim

## Label

**Prototype Acoustic Recovery Score** or **Acoustic reference-position score**
