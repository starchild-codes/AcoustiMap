# Architecture

## Overview

AcoustiMap Restore is a three-tier application:

1. **Frontend** (React/Vite) — user interface for project management, recording upload, and results visualisation
2. **Backend** (FastAPI/Python) — REST API, file storage, and database
3. **Worker** (Python process) — background audio analysis pipeline

## Data flow

```
User → Frontend → API (FastAPI) → Database (SQLite)
                              → File Storage
                              → Job Queue (DB table)

Worker polls DB → picks up job → loads audio → computes features → saves results → updates DB
```

## Components

### Frontend (`src/`)
- `api/` — typed API client functions (no direct fetch in pages)
- `components/` — reusable UI components
- `pages/` — page-level views
- `soundscape/` — soundscape workspace state and utilities

### Backend (`backend/app/`)
- `api/` — FastAPI route handlers
- `models/` — SQLAlchemy ORM models
- `schemas/` — Pydantic validation schemas
- `analysis/` — audio analysis pipeline
- `workers/` — background job processor
- `core/` — configuration
- `database/` — engine and session management

### Storage
- `storage/projects/{project_id}/recordings/` — uploaded audio files
- `storage/projects/{project_id}/artifacts/{recording_id}/` — generated spectrograms and waveforms
- `storage/acoustimap.db` — SQLite database

## Ports

| Service  | Port  |
|----------|-------|
| Frontend | 5173  |
| Backend  | 8001  |
| API docs | 8001/docs |
