# AcoustiMap Restore implementation plan

## Purpose and scope

This plan covers the next production-quality prototype phase. The target is one reliable, API-backed path from project creation and audio upload through analysis, review, temporal interpretation, and transparent export. The product will describe its output as a **reference-based acoustic proxy**, never as a species count, abundance estimate, proof of biodiversity, or causal effect of restoration.

Phase 0 is an audit and planning phase only. No application behavior is changed by this document.

## Audit summary

The repository contains a substantial analysis library, database model, FastAPI route layer, worker, typed frontend API modules, tests, Docker setup, and careful limitations documentation. However, the only substantially API-backed frontend screen is Projects. Opening a real project does not select it; the main Overview and Soundscape workspaces remain independent mock/local applications. As a result, the current interface cannot demonstrate the real pipeline end to end.

The smallest coherent product is therefore:

1. Make a real backend job complete reliably and persist every result needed by the UI.
2. Introduce a single selected-project route/state shared by Projects, the workspace header, and results pages.
3. Replace the primary localStorage/manual-JSON workflow with API queries and mutations.
4. Keep useful browser-only inspection tools only when clearly distinguished from authoritative backend analysis.
5. Hide or explicitly label anything that cannot be connected without inventing data.

## Current architecture and flow

- Frontend: React 18, TypeScript, Vite, Tailwind, Recharts.
- Backend: FastAPI, async SQLAlchemy, SQLite, local file storage.
- Worker: database-polling process calling the synchronous analysis pipeline in an executor.
- Analysis: decoding, preprocessing, segmentation, technical quality metrics, ecoacoustic features, artifacts, reference model, recovery scores, bootstrap, temporal analysis, provenance, and file exports.
- Deployment: three Docker Compose services sharing a storage volume between API and worker.
- Database initialization: `create_all`; Alembic is installed but no migrations are present.
- Tests: analysis-focused unit/integration tests only. There are no API, worker, temporal-analysis, frontend, or Docker smoke tests.

## Mock and local-only UI inventory

These surfaces currently present fixed, illustrative, browser-derived, or manually imported state in a way that can be mistaken for the selected live backend project.

| Surface | Current source | Problem | Planned treatment |
|---|---|---|---|
| Global top navigation | `src/data/mockData.ts` via `TopNav.tsx` | Fixed Mars project, monitoring period, and location appear globally. | Bind to selected backend project; show a project picker/empty state when none is selected. |
| Overview page | Entirely `src/data/mockData.ts` | Score 74, momentum, confidence, counts, coverage, trajectory, evidence, alerts, site map, recorder status, and recovery gap look live. | Replace score/uncertainty/counts/warnings/temporal panels with backend results. Hide device/coverage claims until real telemetry exists. Render site metadata without claiming recorder connectivity. |
| `MetricCard`, `TrajectoryChart`, `EvidenceCard`, `RecoveryGap`, `AlertRow`, `SiteMap`, `SiteStatusRow` | Direct mock imports or mock-typed props | Reusable components encode fixed results and operational claims. | Refactor to backend view models; remove direct mock imports. Keep visual styling. |
| Projects page “Open” action | Backend projects API | It navigates without passing or retaining the chosen project ID, so the destination still opens the fixed demo workspace. | Add URL-based project selection and project-scoped workspace routing. |
| Project “Duplicate” action | Creates project metadata only | The UI label implies a full duplicate, but sites/configurations/recordings are not copied. | Rename to “Copy project details” or implement a documented metadata-only duplicate; do not copy audio implicitly. |
| Soundscape header | `demoProject` from `src/soundscape/demoData.ts` | Fixed Mars metadata is shown even with no backend project. | Use the selected backend project and its real date range. |
| Soundscape Compare tab | Soundscape context, built-in demo, browser audio, or manually imported JSON | Does not read backend recordings/analyses; similarity values can come from illustrative JSON. | Fetch real recordings and latest job analyses; use served backend audio/artifacts. Keep source labels for optional browser diagnostics. |
| Recording Library tab | local reducer/localStorage | Edits, exclusions, filtering, and deletion do not affect backend records or analysis state. | Bind metadata changes/deletion to recording APIs and manual quality review to the review API. Clearly separate system recommendation from human decision. |
| Upload Recordings tab | Browser `File` objects and Web Audio analysis | Explicitly says files are not uploaded to a server; metadata alone persists in localStorage. | Upload to the backend with role, site, timestamp, and monitoring period; display per-file API progress/errors. Browser preview may remain supplemental. |
| Analysis Data tab | User-imported JSON | Requires a manual export/import bridge despite real analysis APIs. | Replace with configuration, job launch, polling, cancel/retry, warnings, and result loading. Move manual import to a clearly labelled compatibility tool outside the golden path, or remove it with a migration note. |
| Recording Detail tab | Browser calculations plus imported/demo metrics | Does not fetch persisted quality flags, analyses, reviews, waveforms, or spectrograms. | Load the latest backend analysis and artifact URLs; submit manual review decisions to the API. |
| Soundscape export menu | Client-generated local JSON/CSV/print HTML | Reports local/demo/imported state rather than authoritative persisted results. | Download backend JSON/CSV/bundle and add a backend-backed human-readable report. |
| Soundscape quality settings | LocalStorage thresholds | These thresholds do not configure the worker; backend thresholds are partly hard-coded. | Bind to a real analysis configuration and label defaults as configurable prototype defaults. |
| Soundscape Methodology tab | Static description of external Python JSON import | It documents the obsolete disconnected flow and still calls the feature “BI.” | Update after integration to describe API/worker flow, accurate metric names, uncertainty, and limitations. |
| Built-in “Load Demonstration Dataset” | `src/soundscape/demoData.ts` | Values are illustrative and labelled as Python even though they were not generated in this checkout. | Remove from the live-results path. Demo mode must use licensed audio run through the real backend, with a persistent demonstration banner. |
| Recording Explorer, Reports, Settings, and global Methodology nav items | Placeholder pages | They are clearly marked as unbuilt and do not fabricate results. | Keep clearly marked or hide from the competition navigation until they add value to the golden path. |

`src/data/mockData.ts` and `src/soundscape/demoData.ts` must not remain reachable as live project result sources. If retained for visual development or tests, they must be explicitly isolated as fixtures.

## Scientific correctness findings

### “BI” is not the canonical Bioacoustic Index

`calculate_bi` sums linear STFT magnitude in the configured band, divides it by magnitude across the full spectrum, and multiplies by 10. The Bioacoustic Index described by Boelman et al. is an area over the biological-band mean spectrum after reference to the band minimum in decibel space. The current feature therefore must not be called the canonical Bioacoustic Index. See [Boelman et al. (2007), DOI 10.1890/07-0004.1](https://doi.org/10.1890/07-0004.1).

Preserve the existing calculation as **Biological-Band Spectral Magnitude Ratio (×10)**. This is more accurate than “energy ratio” because the implementation sums `|STFT|`, not squared magnitude/power. Rename its display labels, schema field, configuration fields, CSV columns, documentation, reference feature list, and tests. For compatibility, accept/read the legacy `bi` key only at a versioned import/export boundary and mark it deprecated; do not show it as “Bioacoustic Index.” Existing results should be rerun rather than silently reinterpreted.

### Score and distance semantics

- Per-recording `healthy_reference_similarity` is currently assigned the recovery score, and `degraded_reference_similarity` is assigned `100 - score`. These are reference positions, not measured similarities.
- Project `healthy_similarity` is currently populated with feature agreement; this is a different quantity. Other summary fields are left `null`.
- The UI should expose the actual `distance_to_healthy` and `distance_to_degraded`, plus the bounded acoustic reference-position/recovery score. It must not relabel one quantity as another.
- “Confidence interval” must remain described as bootstrap uncertainty under the current recordings, labels, features, and configuration—not causal or external-validity confidence.

### Temporal analysis

The current pipeline alphabetically sorts period labels, maps them to equally spaced integers, and reports points per period. It does not use timestamps, so it mishandles labels such as `month_10` and irregular intervals. Temporal output is written to an analysis output file but not persisted in the database or exposed through an API.

The replacement will:

- validate timezone-aware recording timestamps at the API boundary;
- group restoration scores by monitoring-period identifier while deriving a representative date from valid timestamps and reporting the rule used;
- sort chronologically, reject or warn about inconsistent/missing period dates, and retain counts and median scores per period;
- run Theil–Sen against elapsed time (years internally, with points/year and optionally points/month displayed);
- return no direction label with fewer than three valid periods;
- bootstrap the slope by resampling recordings within periods with a fixed seed, reporting requested/successful iterations and percentile bounds;
- store documented configurable direction thresholds in score-points/year, with “Stable” when the interval/threshold rule does not support a directional label;
- persist and expose periods, dates, elapsed times, medians, counts, fitted values, slope, interval, thresholds, exclusions, and caveats.

## Correctness and API gap audit

### Critical worker and job issues

1. `analysis_worker.py` imports both the ORM and Pydantic pipeline classes as `AnalysisConfig`; the second import shadows the ORM class used in `select(...)`. Alias both classes and add a worker integration test.
2. Bootstrap iterations are absent from the database/API configuration. The worker derives them from `random_seed` with an expression that always returns 100, and the pipeline independently caps runs at 100 despite documentation/defaults claiming 500. Add a validated `bootstrap_iterations` field and honor it exactly, with only an explicit safety limit if documented.
3. A job request can contain `recording_ids`, but the IDs are not stored on the job and the worker always analyzes every project recording. Persist the immutable job input set and validate that every requested ID belongs to the project.
4. Progress callback mutations are not committed while the synchronous pipeline runs. Pollers therefore cannot reliably see stage progress. Use a thread-safe progress channel and short independent database sessions for persisted stage updates.
5. Cancelling a running job only updates a database row; the pipeline does not observe cancellation and can later overwrite the state as completed. Add cooperative cancellation checkpoints and terminal-state guards.
6. Retry reuses the same job and can leave duplicate/active analyses. Prefer a new attempt/job linked to the failed job, or explicitly retire partial results before a well-tested retry.
7. Missing files reduce the worker input but not `total_recordings`, and are not represented as recording-level failures. Persist understandable failures for every requested recording.

### Backend result/API gaps

- No project-scoped job list/latest-job endpoint exists, which prevents reload/resume of polling.
- No persisted temporal result or temporal endpoint exists.
- Reference profiles and the full project analysis result are not persisted or exposed.
- Artifact paths are local filesystem strings and there is no safe artifact-serving endpoint; there is also no audio streaming endpoint for backend recordings.
- A summary is saved only when a project recovery score exists. Insufficient-reference and all-warning outcomes need a persisted result state so the UI can explain what is missing.
- Recording-analysis relationships are not explicitly eager-loaded for response serialization; cover flags/reviews with API tests.
- Upload does not first validate project existence, site ownership, habitat enum, timestamp format, empty file, or failed-write cleanup robustly.
- Sites can be created for nonexistent projects unless foreign keys are actively enforced; ownership validation should be explicit and SQLite foreign keys enabled.
- Configuration validation mostly returns warnings where the pipeline model will later reject values. Align the ORM/API/pipeline configuration models and return field-specific 422 errors for invalid settings.
- Important worker settings are hard-coded or mis-mapped: silence threshold, segmentation overlap/minimum duration, NDSI bands, occupancy threshold, distance metric, minimum group sizes, and bootstrap count.
- Old recording analyses are never deactivated when a new result becomes authoritative.
- There is no migration workflow despite schema changes being required; introduce Alembic before evolving persisted data.
- Storage and SQLite defaults are relative to process working directory, making manual clean-clone startup fragile. Resolve defaults from a stable application root or require explicit environment paths, and create the database parent directory.

### Export gaps

- The frontend JSON download helper parses `application/json` into an object even when the caller expects a `Blob`.
- CSV headers and row values are misaligned: the “Quality” column is omitted from rows, shifting later values.
- Exports can select multiple active analyses nondeterministically and do not consistently scope results to a job/configuration.
- The reproducible bundle omits most claimed analysis results, temporal output, bootstrap detail, quality flags, provenance, and artifacts.
- A competition report endpoint is missing. It must report inputs, configuration, exclusions, distances/reference position, bootstrap uncertainty, temporal results only when sufficient, and limitations.

### Repository hygiene and deployment gaps

- There is no `.gitignore` or `.dockerignore`.
- Python caches/bytecode, `dist/`, and `tsconfig.tsbuildinfo` are tracked.
- No license file or recorded license decision exists. A license must not be guessed; add `LICENSE-DECISION.md` requesting the owner’s intended license unless the owner supplies one.
- The root frontend Docker image builds production assets but launches the Vite development server.
- Docker health checks and startup readiness are absent; worker `depends_on` does not ensure the API/database is ready.
- Documentation contains inconsistent defaults (`standard` versus `robust`, 100 versus 500 bootstrap iterations, and different frequency bands).
- Several apparent legacy/duplicate analysis modules (`quality.py`/`quality_metrics.py`, `reference.py`/specialized reference modules, `artifacts.py`/`spectrograms.py`) need call-graph confirmation. Do not delete them until imports, tests, and exported interfaces prove them unused; document any later removal.

## Implementation sequence

### Phase 1 — correctness and repository hygiene

1. Add `.gitignore` and `.dockerignore`; untrack generated caches, bytecode, build output, test caches, local databases, uploaded audio, artifacts, logs, environment files, and editor/OS files without deleting user data.
2. Add `LICENSE-DECISION.md` unless the repository owner supplies an explicit license choice.
3. Stabilize settings/storage/database paths for root, backend-directory, and Docker launches; enable SQLite foreign keys and add environment examples without secrets.
4. Introduce Alembic with a baseline suitable for existing databases, then add required configuration/job/result fields through migrations.
5. Fix the worker class-name collision, requested-recording persistence, configuration mapping, bootstrap behavior, progress commits, cancellation, retry semantics, missing-file accounting, and active-result replacement.
6. Rename the noncanonical `bi` feature throughout code and documentation, with a narrow versioned compatibility adapter.
7. Add focused tests for every fix, including a worker test that creates and completes a real queued job.

Exit gate: from a clean database, a queued job with a chosen configuration and recording subset completes or fails intelligibly; configured bootstrap count is honored; progress is poll-visible; cancel cannot become completed; all tests pass.

### Phase 2 — backend/API completion

1. Add strict, typed validation for project/site ownership, uploads, roles, timestamps, periods, and configuration fields.
2. Add project-scoped job listing/latest endpoints and immutable job input/attempt metadata.
3. Persist a complete job result envelope even when scoring is unavailable: reference profiles, recording results, summary, bootstrap, temporal result, warnings, exclusions, provenance, and analysis version.
4. Expose job-scoped recording results and project summary/temporal endpoints so the UI never mixes configurations or runs.
5. Add safe project-scoped audio and artifact download/stream endpoints; never expose arbitrary filesystem paths.
6. Make manual review typed and auditable. Document whether a review affects only display or requires a new analysis; do not silently recalculate cached summaries.
7. Complete JSON, CSV, reproducible bundle, and human-readable report exports with deterministic latest/job selection.
8. Add API and worker tests for success, insufficient data, partial failure, cancellation, retry, stale results, validation, artifact access, and exports.

Exit gate: the OpenAPI surface alone supports every golden-path operation and returns enough typed information to render all required states without local fixtures.

### Phase 3 — frontend/backend integration

1. Add URL-based selected-project state and route every project action through it.
2. Build a guided project workspace: project details → sites/roles → recordings/timestamps → configuration → review readiness → run analysis.
3. Replace local upload with backend multipart upload, per-file status, duplicate/validation errors, and editable metadata.
4. Replace Analysis Data import as the main path with real configuration forms, readiness checks, job launch, polling, cancel/retry, reload recovery, and actionable failure states.
5. Adapt backend recordings/results into presentational view models for Library, Compare, Detail, and Overview. Use job/config IDs everywhere to prevent mixed results.
6. Display measured technical/ecoacoustic metrics, quality flags, manual review status, actual waveform/spectrogram assets, reference distances, recovery score, bootstrap bounds, inclusion/exclusion reasons, and temporal result/caveats.
7. Use honest empty/loading/error/stale states. Never fall back to mock numbers when an API response is absent.
8. Point all exports to backend endpoints and add download/error feedback.
9. Update Methodology and in-product copy to the revised names and scientific limits.
10. Remove `mockData`/`demoData` from production result imports. Preserve any useful browser audio inspector as explicitly supplemental, or document and remove it if it complicates the golden path.

Exit gate: after reload, a user can select a real project and complete the entire flow without localStorage, built-in scores, manual JSON, or fabricated fallback data.

### Phase 4 — competition demo mode

1. Select a small audio source only after confirming redistribution/download terms for every file. Prefer a reproducible download-and-checksum script when bundling is not clearly allowed.
2. Create a manifest with at least three healthy references, three degraded references, and restoration recordings across at least three dated periods. Include one licensed poor-quality example or create a clearly documented deterministic degradation transform if the source license permits derivatives.
3. Run the real pipeline and verify that the data demonstrate a visible, honestly explainable pattern. Do not tune labels or thresholds to guarantee a claim; if the trend is not supported, select a more suitable licensed demonstration subset and document the selection process.
4. Add an idempotent demo setup/import command that creates project/sites/configuration and uploads or locates the verified files. The demo must be visibly labelled as demonstration data with provenance.
5. Create `docs/demo-data.md`, `docs/demo-script.md`, and `docs/judges-questions.md`, covering license/provenance, uncertainty, bias, species limitations, causation, scalability, and novelty/prior-art caution.
6. Verify the final report contains methods, configuration, results, uncertainty, exclusions, temporal caveats, and limitations.

Exit gate: a fresh setup can reproduce the same demo from documented sources and checksums, and every visible result is generated by the backend from those files.

### Phase 5 — verification

1. Run all backend unit, API, worker, temporal, and export tests.
2. Add required temporal tests: chronological ordering, non-lexical labels, irregular intervals, invalid/missing timestamps, fewer than three periods, period counts/medians, slope units, deterministic bootstrap bounds, and configurable direction thresholds.
3. Run frontend type checking and production build; add focused component/integration tests for project selection, upload, job polling, failures, insufficient results, and exports.
4. Build and run Docker Compose from a clean checkout/empty volume, including health/readiness checks.
5. Manually execute the golden path and reload at each major state to verify persistence and recovery.
6. Inspect generated waveform/spectrogram/report artifacts visually and verify download contents/checksums.
7. Record exact commands, environment, results, failures, and remaining limitations in `docs/verification.md`.

Exit gate: clean-clone Docker and manual startup instructions both reproduce the golden path, with test/build evidence and unresolved limitations explicitly recorded.

## Proposed logical change sets

To keep review manageable, use separate commits/change sets for:

1. hygiene, paths, and license decision;
2. migrations and aligned configuration schemas;
3. worker/job correctness and tests;
4. metric rename and documentation;
5. temporal calculation/persistence/API and tests;
6. results/artifacts/exports API and tests;
7. project routing and setup/upload UI;
8. job/configuration UI;
9. result/overview/report UI and mock removal;
10. demo data tooling/docs;
11. Docker and final verification evidence.

Each change set should state any removed or superseded behavior. Existing browser comparison/import functionality will not be deleted silently: it will either be retained as an explicitly labelled compatibility/diagnostic tool or removed with its replacement and rationale documented.

## Golden-path acceptance criteria

- A student can create/select a project and return to it after reload.
- Sites and recordings have backend-persisted roles and validated timestamps.
- The UI blocks analysis with specific instructions until minimum reference requirements are met.
- A selected configuration, including bootstrap count and temporal thresholds, is exactly the one executed and exported.
- Job progress represents persisted real stages; failures, cancellation, and retry are understandable.
- Every displayed metric and artifact is traceable to a recording analysis/job/configuration.
- Reference results use honest distance/reference-position terminology.
- Bootstrap bounds include their resampling scope and iteration counts.
- Momentum is chronological, elapsed-time based, uncertainty-aware, and absent below three valid periods.
- Exclusions and manual review decisions remain transparent and auditable.
- The report contains methods, provenance, results, uncertainty, warnings, and the core non-causality/species/biodiversity limitations.
- No production screen substitutes mock, random, or placeholder analysis data when real data are absent.

## Out of scope for this prototype phase

- Species identification, abundance estimation, or causal attribution.
- Universal calibration across ecosystems.
- Authentication, cloud object storage, multi-worker scaling, live recorder telemetry, and production multi-tenancy unless required to make the local competition demo reliable.
- Speculative AI features, prediction of future recovery, patentability conclusions, and claims that prior art does not exist.
