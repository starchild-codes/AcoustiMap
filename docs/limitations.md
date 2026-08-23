# Limitations

## Scientific limitations

1. **Acoustic features are not biodiversity measures.** ACI, the Biological-Band Spectral Magnitude Ratio, and other features capture aspects of acoustic structure but do not directly count species or measure total biodiversity.

2. **Recovery score is model-dependent.** The score depends on the selected features, scaling method, and distance metric. Different configurations may produce different scores for the same recordings.

3. **No causal inference.** A higher recovery score does not prove that restoration caused the change. Controlled study designs are needed for causal claims.

4. **Not comparable across ecosystems.** Scores from different ecosystems (coral reef vs. forest) are not directly comparable without calibration.

5. **Bootstrap uncertainty is not certainty.** The confidence interval reflects resampling variability under the current dataset, not external validity.

## Technical limitations

1. **Single-worker processing.** The prototype uses a single background worker. Large datasets will process sequentially.

2. **SQLite database.** Suitable for local prototype use. Not designed for concurrent multi-user access.

3. **Local file storage.** Audio files are stored on the local filesystem. No cloud storage integration.

4. **No authentication.** The API has no authentication. Not suitable for production deployment without adding auth.

5. **No real-time updates.** The frontend polls for job status. No WebSocket or SSE for real-time updates.

## What is NOT implemented

- Feature ablation experiments page
- Negative controls (label shuffling, reference swap, noise-only)
- Leaflet map view for sites
- Provenance drawer in the UI
- Speech detection (reviewer-assigned flag only)
- Automated species identification

## Known issues

- Existing unversioned SQLite databases must be backed up and upgraded with `alembic upgrade head`. The initial adoption migration is intentionally irreversible; restore a backup to roll back.
- The CC0 Amazon source manifest is a technical pipeline demonstration only. Its synthetic degraded references and repeated source observations are not ecological recovery evidence.
- Docker is configured for production static frontend serving and schema-first startup, but container runtime verification requires Docker to be installed on the deployment machine.
