# AcoustiMap Restore — Backend

Real Python audio-analysis pipeline for ecosystem restoration monitoring.

## Quick start

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

In a separate terminal, start the worker:

```bash
python -m app.workers.analysis_worker
```

Seed the demonstration project:

```bash
python -m app.seed
```

## API documentation

Once running, visit `http://localhost:8001/docs` for interactive OpenAPI documentation.

## Architecture

```
backend/
├── app/
│   ├── api/           # FastAPI route handlers
│   ├── core/          # Configuration
│   ├── database/      # SQLAlchemy engine and session
│   ├── models/        # ORM models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   ├── analysis/      # Audio analysis pipeline
│   │   ├── pipeline.py    # Technical + ecoacoustic features
│   │   ├── quality.py     # Quality-control engine
│   │   ├── reference.py   # Reference model, recovery score, bootstrap
│   │   └── artifacts.py   # Spectrogram/waveform generation
│   ├── workers/       # Background analysis worker
│   ├── seed.py        # Demonstration data seeding
│   └── main.py        # FastAPI app entry point
├── tests/
└── requirements.txt
```

## Analysis pipeline

All metrics use documented formulas:

- **ACI** (Acoustic Complexity Index): Pieretti et al. 2011
- **Biological-Band Spectral Magnitude Ratio (×10)**: configured-band linear STFT magnitude ratio; not the canonical Bioacoustic Index
- **Spectral entropy**: Shannon entropy of normalized power spectrum
- **Temporal entropy**: Shannon entropy of Hilbert envelope
- **ADI** (Acoustic Diversity Index): Pijanowski et al. 2011
- **AEI** (Acoustic Evenness Index): Villanueva-Rivera et al. 2011
- **NDSI** (Normalized Difference Soundscape Index): Kasten et al. 2012

Failed calculations return null with an error message. No random values are generated.
