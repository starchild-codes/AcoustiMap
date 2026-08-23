# AcoustiMap Restore

Real audio-analysis platform for ecosystem restoration monitoring.

## What this is

AcoustiMap Restore is a prototype application that lets restoration ecologists upload environmental audio recordings, run a real Python audio-analysis pipeline, and compare acoustic structure across healthy, restored, and degraded sites.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **Analysis**: NumPy + SciPy + Librosa + scikit-learn
- **Worker**: Background process for audio analysis jobs
- **Storage**: Local filesystem for audio files and generated artifacts

## Quick start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- API docs: http://localhost:8001/docs

## Quick start (manual)

### Backend

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

### Worker (separate terminal)

```bash
cd backend
python -m app.workers.analysis_worker
```

### Seed demo data

```bash
cd backend
python -m app.seed
```

### Frontend

```bash
npm install
npm run dev
```

## What works

- Create, edit, archive, delete, and copy project metadata
- Upload audio recordings (WAV, FLAC, MP3, M4A, OGG) with metadata
- Real Python audio analysis: ACI, Biological-Band Spectral Magnitude Ratio (×10), spectral entropy, temporal entropy, ADI, AEI, NDSI
- Technical quality features: RMS, peak, clipping, silence, zero-crossing rate, frequency band energy
- Spectrogram and waveform generation from uploaded audio
- Rule-based quality control with manual override and audit trail
- Reference model with transparent recovery score calculation
- Bootstrap uncertainty estimation
- Chronological Theil–Sen recovery momentum using actual elapsed dates, with internal bootstrap bounds
- API-backed React project setup, job progress, results, quality flags, artifacts, and exports
- Export project JSON, recording CSV, and reproducible analysis bundle (ZIP)
- Docker Compose for one-command setup
- Alembic migration workflow for fresh and prior unversioned SQLite databases
- Human quality decisions in live results, with a persisted audit trail

## What is prototype-only

- Feature ablation experiments page
- Negative controls (label shuffling, reference swap)
- Leaflet map view for sites
- Provenance drawer

## Scientific claims supported

- Acoustic features are calculated from real audio using documented formulas
- Recovery score is transparently computed from category centroid distances
- Bootstrap uncertainty reflects actual resampling of the data
- Quality flags are based on measured signal properties

## Claims NOT supported

- Acoustic indices are not direct measures of biodiversity
- Recovery score does not imply causation
- Results require ecological context and external validation
- Scores are not comparable between unrelated ecosystems without calibration

## Documentation

- [Architecture](docs/architecture.md)
- [Methodology](docs/methodology.md)
- [Scoring](docs/scoring.md)
- [Data model](docs/data-model.md)
- [API reference](docs/api.md)
- [Reproducibility](docs/reproducibility.md)
- [Limitations](docs/limitations.md)
- [CC0 technical demo source](example_data/cc0-amazon-demo/README.md)
