# Provenance

## What is recorded

Every analysis run produces a complete provenance record containing:

- Analysis job ID
- Project ID
- Recording IDs
- Input file checksums (SHA-256)
- Original filenames
- Software version
- Python version and platform
- Dependency versions (NumPy, SciPy, Librosa, scikit-learn, etc.)
- Complete analysis configuration
- Random seed
- Preprocessing operations applied
- Included features
- Dropped features and reasons
- Scaler parameters
- Distance metric used
- Reference recording IDs (healthy, degraded)
- Restored recording IDs
- Excluded recordings and reasons
- Start and completion timestamps
- Total runtime
- Warnings
- Errors

## Download

The provenance record is saved as `provenance.json` in the output directory and can be downloaded via the API.

## Purpose

This allows another researcher to inspect exactly how a result was produced, what data was included or excluded, and what parameters were used.
