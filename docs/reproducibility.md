# Reproducibility

## Reproducible analysis bundle

Export a ZIP containing all analysis metadata (no raw audio by default):

```
acoustimap-export/
├── project.json
├── sites.csv
├── recordings.csv
├── analysis-config.json
├── README.txt
└── artifacts/ (optional)
```

### Including raw audio

Add `?include_audio=true` to the export endpoint.

**Warnings:**
- Raw audio may contain human speech — check privacy requirements
- File sizes can be large
- Dataset licensing may restrict redistribution
- Sensitive site coordinates should be redacted for sensitive projects

## Provenance

Every analysis result records:
- Analysis job ID and configuration ID
- Software version
- Input file checksum
- Processing timestamp
- Runtime
- Feature set used
- Scaling method
- Random seed

This allows another researcher to inspect exactly how a result was produced.

## Determinism

- Random seed is configurable (default: 42)
- Bootstrap results are deterministic for a given seed
- Feature calculations are deterministic
- Spectrogram generation uses fixed parameters (FFT size, hop length, window function)
