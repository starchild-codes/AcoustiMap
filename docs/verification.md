# Verification

Verified on 2026-08-14 on Windows, Python 3.12, Node 24.17.0, and npm 11.13.0.

## Automated checks

### Backend dependencies

```powershell
py -3.12 -m pip install -r backend/requirements.txt
```

Result: pass. The direct `soundfile` dependency was added to `backend/requirements.txt`. Pip reported an unrelated conflict with a globally installed Streamlit version; AcoustiMap's pinned environment installed successfully. A dedicated virtual environment is recommended.

### Focused scientific and worker tests

```powershell
py -3.12 -m pytest backend/tests/analysis/test_quality_metrics.py backend/tests/analysis/test_ecoacoustic_indices.py backend/tests/analysis/test_temporal_analysis.py backend/tests/test_analysis_worker.py -q
```

Result: **26 passed**. This covers the renamed biological-band metric, chronological/irregular temporal behavior, insufficient dates/periods, direction labels, temporal bootstrap determinism, quality review behavior, and exact worker bootstrap configuration mapping.

### Full backend suite

```powershell
py -3.12 -m pytest backend/tests -q
```

Result: **69 passed**, 23 warnings, in 85.77 seconds on the final post-change rerun. Warnings are upstream deprecations from Pydantic class-based config, Matplotlib/pyparsing, Librosa/audioread, and pytest-asyncio's future fixture-loop default.

### Frontend production build

```powershell
npm install
npm run build
```

Result: pass. TypeScript project build and Vite production build completed; 1,584 modules transformed. npm reported three dependency audit findings (one moderate, two high) that require separate dependency review rather than an automatic breaking upgrade.

### Diff checks

```powershell
git diff --check
git ls-files | rg '(__pycache__|\.pyc$|\.tsbuildinfo$|^dist/)'
```

Result: `git diff --check` passed. The tracked generated-file query returns no paths after the staged removals. Windows emitted informational LF-to-CRLF conversion warnings.

## End-to-end backend smoke verification

A temporary clean SQLite database and storage directory were used. The smoke script:

1. created a project and configuration through FastAPI;
2. generated and uploaded nine deterministic five-second WAV files through the upload API;
3. labelled three healthy, three degraded, and three restoration recordings;
4. assigned January, February, and October 2026 timestamps to restoration periods;
5. created a job with an explicit nine-recording ID set;
6. ran the real worker;
7. fetched the job-scoped results and project summary;
8. fetched an analysis waveform through the scoped artifact endpoint; and
9. streamed an uploaded recording through the scoped audio endpoint.

Observed result:

```text
job state: completed
recording results: 9
project acoustic recovery score: 49.31507980819833
bootstrap: 5 successful / 5 requested
temporal result: sufficient (Weakly declining for this synthetic technical dataset)
waveform response: 41,646 bytes
audio response: 220,544 bytes
```

The synthetic signals are technical verification inputs, not ecological data and not a competition demo dataset.

## Progress and cancellation verification

A second real job was run in a background thread while its API state was polled every 200 ms. Polling observed persisted progress through 40%. The cancel endpoint was then called. The worker stopped, its thread exited, and the final API state remained `cancelled` rather than being overwritten as completed.

```text
final state: cancelled
poll samples: 16
maximum observed progress: 40.0%
worker thread alive after join: false
```

## Docker verification

Not run: Docker is not installed in the verification environment. Compose was statically hardened with a migration service, readiness dependencies, API/frontend health checks, and a production Nginx frontend image; clean container startup still needs verification on a machine with Docker.

## Local run instructions

Use a clean virtual environment. Apply the versioned migration before starting the API or worker.

Backend API terminal:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8001
```

Worker terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.workers.analysis_worker
```

Frontend terminal:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

## Manual demo path

1. Open **Projects**, create a project, and select **Open**.
2. In **Setup**, optionally add healthy, degraded, and restoration sites.
3. In **Recordings**, upload at least three healthy-reference files, three degraded-reference files, and three restoration files.
4. Give every upload a timezone-resolved date/time and monitoring-period label. Put the restoration recordings in at least three chronological periods.
5. Edit and save any recording role, site, timestamp, period, or recorder ID as needed.
6. In **Analysis**, create the prototype-default configuration. Select a bootstrap count up to the documented 2,000-iteration safety limit.
7. Start analysis. The job panel polls real persisted stage, percentage, processed count, failure count, and errors. Cancellation and failed-job retry are available.
8. Open **Results** after completion to inspect the acoustic recovery score, reference distances, bootstrap bounds, temporal slope/period table, recording-level quality flags and metrics, audio, waveform/spectrogram artifacts, warnings, and limitations.
9. Download JSON, CSV, or the reproducible ZIP from **Transparent exports**.
10. Use **Human quality decision** on each recording result when a reviewer needs to include, retain for review, or exclude an analysis; the decision and notes are retained in the result audit trail.

No screen substitutes an illustrative score when a project has no result; it shows an onboarding or insufficient-data state.

## Known limitations

- Alembic migration `20260823_01` creates a fresh schema and upgrades the previous unversioned prototype schema. Back up existing databases before upgrading; the adoption migration is intentionally irreversible.
- The database is SQLite and the worker is single-process. This is appropriate for the local prototype, not concurrent production use.
- Docker startup was not verified in this environment because Docker is not installed. Compose is configured for a migration-first, health-gated launch and production static frontend serving.
- The reproducible ZIP is improved only indirectly in this cycle and still does not contain every desired report/provenance artifact. JSON and CSV use persisted backend data.
- A reproducible CC0 Amazon source manifest is available at `example_data/cc0-amazon-demo/`; it is explicitly a technical pipeline demo, not evidence of ecological recovery.
- Human quality-review controls are exposed in the streamlined Results workspace and persist an audit trail.
- The legacy browser/import/mock soundscape stack has been removed.
- Recording Explorer, Reports, Settings, and the global Methodology navigation entries remain explicit “Coming next” placeholders.
- `npm audit` is clean after the Vite 8 and dependency update.

## Release follow-up verification (2026-08-23)

- `py -3.12 -m pytest tests/test_migrations.py tests/test_analysis_worker.py -q`: **3 passed**. This exercises fresh-schema creation, upgrade from the previous unversioned column names, and worker bootstrap configuration mapping.
- `py -3.12 -m alembic -c alembic.ini current`: **20260823_01 (head)**.
- `npm run build`: passed with Vite 8.2.2.
- `npm audit --json`: **0 vulnerabilities**.
- Docker CLI was not present, so a container run could not be performed. The Compose document was parsed structurally and its migration, health-gating, frontend port, and build-argument assertions passed.
