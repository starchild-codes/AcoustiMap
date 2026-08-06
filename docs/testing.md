# Testing

## Running tests

```bash
cd backend
pytest tests/analysis -v
```

## Test structure

```
tests/analysis/
├── test_audio_loader.py        — WAV loading, metadata, checksums, error handling
├── test_preprocessing.py       — Mono conversion, resampling, DC offset, normalisation
├── test_segmentation.py        — Segment creation, IDs, short segments, overlap
├── test_quality_metrics.py     — Silence/clipping/short detection, status suggestion
├── test_spectrograms.py        — PNG generation from real audio
├── test_ecoacoustic_indices.py — ACI, BI, entropy, occupancy, NDSI, determinism
├── test_aggregation.py         — Median aggregation, fatal exclusion, modelling matrix
├── test_reference_model.py     — Scaling, centroids, insufficient data
├── test_recovery_score.py      — Score near 0/50/100, feature agreement
├── test_bootstrap.py           — Reproducibility, insufficient groups
├── test_pipeline.py            — Full integration test with synthetic recordings
└── fixtures/                   — Synthetic test signal generator
```

## Synthetic test signals

All test fixtures are generated in memory or temporary files using deterministic seeds:

- Silence
- Pure sine waves (200 Hz, 2000 Hz)
- Multi-tone signal
- White noise
- Pink noise approximation
- Clipped sine wave
- Amplitude-modulated signal
- Intermittent pulses
- Short signal (below minimum duration)
- Stereo signal with different channels

**All synthetic test audio is clearly marked as "Synthetic technical test audio — not ecological data."**

## Test categories

### Unit tests
Test individual modules in isolation with controlled inputs.

### Integration tests
Run the complete pipeline with a synthetic project containing:
- 3 healthy, 3 degraded, 3 restored recordings
- 1 silent recording (should get warnings)
- 1 clipped recording (should get warnings)
- 1 corrupt file (should fail without stopping others)

Verifies:
- Corrupt file fails without crashing the pipeline
- Silent and clipped files receive quality warnings
- Valid recordings produce features and artifacts
- Reference profiles are built
- Recovery scores are calculated
- Bootstrap output exists
- Provenance lists included and excluded files
- Export files are generated
