# API reference

Base URL: `http://localhost:8001`

Interactive docs: `http://localhost:8001/docs`

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List projects (search, status filters) |
| POST | /api/projects | Create project |
| GET | /api/projects/{id} | Get project |
| PATCH | /api/projects/{id} | Update project |
| DELETE | /api/projects/{id} | Delete project |

## Sites

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/{project_id}/sites | List sites |
| POST | /api/projects/{project_id}/sites | Create site |
| PATCH | /api/sites/{site_id} | Update site |
| DELETE | /api/sites/{site_id} | Delete site |

## Recordings

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/{project_id}/recordings | List recordings |
| POST | /api/projects/{project_id}/recordings | Upload recording (multipart) |
| GET | /api/recordings/{recording_id} | Get recording |
| PATCH | /api/recordings/{recording_id} | Update recording metadata |
| DELETE | /api/recordings/{recording_id} | Delete recording |

## Configurations

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/{project_id}/configurations | List configurations |
| POST | /api/projects/{project_id}/configurations | Create configuration |
| PATCH | /api/configurations/{config_id} | Update configuration |

## Analysis

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/projects/{project_id}/analysis-jobs | Create analysis job |
| GET | /api/projects/{project_id}/analysis-jobs | List project jobs |
| GET | /api/analysis-jobs/{job_id} | Get job status |
| GET | /api/analysis-jobs/{job_id}/results | Get job-scoped recording results |
| POST | /api/analysis-jobs/{job_id}/cancel | Cancel job |
| POST | /api/analysis-jobs/{job_id}/retry | Retry failed job |
| GET | /api/recordings/{recording_id}/analyses | List analyses for recording |
| GET | /api/projects/{project_id}/summary | Get project summary |
| POST | /api/analyses/{analysis_id}/manual-review | Create manual quality override |
| GET | /api/analyses/{analysis_id}/artifacts/{name} | Download a scoped analysis artifact |
| GET | /api/recordings/{recording_id}/audio | Stream scoped recording audio |

## Exports

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/{project_id}/exports/json | Project JSON export |
| GET | /api/projects/{project_id}/exports/csv | Recording CSV export |
| GET | /api/projects/{project_id}/exports/reproducible-bundle | Reproducible ZIP bundle |

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
