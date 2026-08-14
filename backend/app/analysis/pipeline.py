"""
Pipeline orchestration: the single entry point for running a complete analysis.

run_project_analysis(project_id, recording_ids, configuration, output_directory)
    -> ProjectAnalysisResult

Stages:
1. Validate configuration
2. Load project and recording metadata
3. Verify files and checksums
4. Decode audio
5. Preprocess
6. Segment
7. Calculate technical metrics
8. Generate quality flags
9. Calculate ecoacoustic features
10. Generate artifacts
11. Aggregate segment features
12. Save recording analyses
13. Prepare modelling matrix
14. Construct reference profiles
15. Calculate restored-recording scores
16. Aggregate site and project results
17. Calculate evidence consistency
18. Run bootstrap analysis
19. Run temporal analysis when valid
20. Produce provenance
21. Export final structured results
22. Update analysis-job status
"""

import time
import logging
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from typing import Callable

from .config import AnalysisConfig
from .schemas import (
    ProjectAnalysisResult, RecordingResult, ReferenceProfile,
)
from .exceptions import AudioAnalysisError, AudioDecodeError, InvalidAudioError, InsufficientReferenceDataError, AnalysisCancelledError
from .audio_loader import load_audio
from .preprocessing import preprocess
from .segmentation import segment_audio
from .feature_pipeline import process_segment, suggest_quality_status
from .aggregation import aggregate_segments, build_modelling_matrix
from .reference_model import build_reference_model, extract_feature_vector
from .recovery_score import calculate_recovery_scores, aggregate_scores
from .confidence import calculate_evidence_consistency
from .bootstrap import run_bootstrap
from .temporal_analysis import calculate_temporal_analysis
from .provenance import create_provenance, get_dependency_versions
from .export import export_results
from .spectrograms import generate_all_artifacts

logger = logging.getLogger(__name__)

DEFAULT_FEATURE_NAMES = [
    "aci", "biological_band_spectral_magnitude_ratio", "spectral_entropy", "temporal_entropy",
    "biological_band_occupancy", "ndsi", "anthropogenic_noise_pressure",
]


def run_project_analysis(
    project_id: str,
    recordings: list[dict],
    configuration: AnalysisConfig,
    output_directory: str,
    analysis_job_id: str = "",
    progress_callback: Callable[[str, float, str | None], None] | None = None,
    cancellation_check: Callable[[], bool] | None = None,
) -> ProjectAnalysisResult:
    """
    Run the complete analysis pipeline.

    Args:
        project_id: Project identifier.
        recordings: List of recording dicts with keys:
            recording_id, file_path, habitat_category, site_id,
            timestamp, monitoring_period, recorder_id, notes
        configuration: AnalysisConfig instance.
        output_directory: Where to save output files.
        analysis_job_id: Job ID for tracking.
        progress_callback: Optional callback(stage_name, percent, current_recording).

    Returns:
        ProjectAnalysisResult with all results.
    """
    start_time = datetime.now(timezone.utc)
    config_dict = configuration.to_dict()
    warnings: list[str] = []
    errors: list[str] = []

    def report(stage: str, pct: float, current: str | None = None):
        if cancellation_check and cancellation_check():
            raise AnalysisCancelledError("Analysis cancelled by user")
        if progress_callback:
            progress_callback(stage, pct, current)

    # Stage 1: Validate configuration (already done by Pydantic)
    report("Validation", 2, None)

    # Stage 2: Load metadata (already provided)
    report("Loading metadata", 5, None)

    total = len(recordings)
    recording_results: list[RecordingResult] = []
    failed_count = 0

    # Process each recording
    for i, rec_meta in enumerate(recordings):
        rec_id = rec_meta.get("recording_id", f"rec_{i}")
        file_path = rec_meta.get("file_path", "")
        habitat = rec_meta.get("habitat_category", "restored")

        stage_label = f"Processing recording {i+1}/{total}: {rec_meta.get('filename', rec_id)}"
        report(stage_label, 5 + (i / max(1, total)) * 35, rec_id)

        try:
            # Stage 4: Decode audio
            loaded = load_audio(file_path)

            # Stage 5: Preprocess
            preprocessed = preprocess(
                loaded.samples,
                loaded.sample_rate,
                target_sample_rate=configuration.target_sample_rate,
                channel_mode=configuration.channel_mode,
                remove_dc_offset=configuration.remove_dc_offset,
                amplitude_normalization=configuration.amplitude_normalization,
            )

            audio = preprocessed.samples
            sr = preprocessed.sample_rate

            if audio.ndim > 1:
                audio_mono = np.mean(audio, axis=1).astype(np.float32)
            else:
                audio_mono = audio

            # Stage 6: Segment
            segments = segment_audio(
                audio_mono, sr, rec_id,
                segment_duration_seconds=configuration.segment_duration_seconds,
                segment_overlap_seconds=configuration.segment_overlap_seconds,
                minimum_valid_duration_seconds=configuration.minimum_valid_duration_seconds,
            )

            if len(segments) == 1 and segments[0].duration < configuration.segment_duration_seconds:
                warnings.append(f"Recording {rec_id} is shorter than segment duration; analysed as one segment.")

            # Stage 7-9: Process each segment
            segment_results = []
            for seg in segments:
                if cancellation_check and cancellation_check():
                    raise AnalysisCancelledError("Analysis cancelled by user")
                seg_result = process_segment(seg, sr, config_dict)
                segment_results.append(seg_result)

            # Stage 10: Generate artifacts
            report(f"Generating artifacts: {rec_id}", 40 + (i / max(1, total)) * 10, rec_id)
            artifacts_dir = Path(output_directory) / "artifacts"
            artifacts = {}
            try:
                artifacts = generate_all_artifacts(audio_mono, sr, rec_id, str(artifacts_dir), config_dict)
            except Exception as e:
                logger.warning("Artifact generation failed for %s: %s", rec_id, e)
                warnings.append(f"Artifact generation failed for {rec_id}: {e}")

            # Stage 11: Aggregate
            recording_result = aggregate_segments(
                segment_results, rec_id,
                configuration_id=configuration.software_version,
                artifacts=artifacts,
                input_checksum=loaded.checksum,
                runtime_seconds=0.0,  # Will be set later
            )

            # Add metadata to quality flags
            meta_for_flags = {
                "timestamp": rec_meta.get("timestamp"),
                "site_id": rec_meta.get("site_id"),
            }

            recording_results.append(recording_result)

        except AnalysisCancelledError:
            raise
        except (AudioDecodeError, InvalidAudioError) as e:
            logger.error("Failed to process %s: %s", rec_id, e)
            errors.append(f"{rec_id}: {e}")
            failed_count += 1
            # Create a failed recording result
            recording_results.append(RecordingResult(
                recording_id=rec_id,
                quality_status="failed",
                technical=__import__("app.analysis.schemas", fromlist=["TechnicalFeatures"]).TechnicalFeatures(),
                ecoacoustic=__import__("app.analysis.schemas", fromlist=["EcoacousticFeatures"]).EcoacousticFeatures(),
                errors=[str(e)],
                input_checksum="",
            ))
        except Exception as e:
            logger.error("Unexpected error processing %s: %s", rec_id, e, exc_info=True)
            errors.append(f"{rec_id}: unexpected error: {e}")
            failed_count += 1

    # Stage 13: Prepare modelling matrix
    report("Preparing modelling matrix", 50, None)
    matrix, feature_names, valid_rec_ids, excluded_ids = build_modelling_matrix(
        recording_results, DEFAULT_FEATURE_NAMES
    )

    if matrix is None or not feature_names:
        warnings.append("No usable features for reference modelling.")
        return ProjectAnalysisResult(
            project_id=project_id,
            analysis_job_id=analysis_job_id,
            configuration=config_dict,
            recording_results=recording_results,
            feature_names=[],
            total_recordings=total,
            processed_recordings=total - failed_count,
            failed_recordings=failed_count,
            excluded_recordings=len(excluded_ids),
            warnings=warnings,
            errors=errors,
        )

    # Group recordings by habitat
    healthy_features: list[dict] = []
    degraded_features: list[dict] = []
    restored_features: list[dict] = []
    healthy_ids: list[str] = []
    degraded_ids: list[str] = []
    restored_ids: list[str] = []
    period_observations: dict[str, list[tuple[float, str | None]]] = {}

    for rec in recording_results:
        if rec.quality_status not in ("valid", "review"):
            continue
        # Find the original metadata
        rec_meta = next((r for r in recordings if r.get("recording_id") == rec.recording_id), {})
        habitat = rec_meta.get("habitat_category", "restored")
        eco = rec.ecoacoustic.model_dump()
        eco.pop("aci_by_band", None)

        if habitat == "healthy":
            healthy_features.append(eco)
            healthy_ids.append(rec.recording_id)
        elif habitat == "degraded":
            degraded_features.append(eco)
            degraded_ids.append(rec.recording_id)
        elif habitat == "restored":
            restored_features.append(eco)
            restored_ids.append(rec.recording_id)

    # Stage 14: Construct reference profiles
    report("Building reference model", 58, None)
    reference_profiles: dict[str, ReferenceProfile] = {}
    recovery_scores = []
    project_score = None
    confidence_result = None
    bootstrap_result = None

    try:
        model = build_reference_model(
            healthy_features, degraded_features, restored_features,
            healthy_ids, degraded_ids, restored_ids,
            feature_names,
            scaling_method=configuration.reference_scaling,
            distance_metric=configuration.distance_metric,
            minimum_recordings_per_group=configuration.minimum_recordings_per_reference_group,
        )

        reference_profiles = {
            "healthy": ReferenceProfile(
                habitat="healthy",
                recording_ids=model.healthy_recording_ids,
                group_size=len(model.healthy_recording_ids),
                centroid=model.healthy_centroid.tolist() if model.healthy_centroid is not None else [],
                per_feature_dispersion=model.healthy_dispersion,
                feature_names=feature_names,
                warnings=model.warnings,
            ),
            "degraded": ReferenceProfile(
                habitat="degraded",
                recording_ids=model.degraded_recording_ids,
                group_size=len(model.degraded_recording_ids),
                centroid=model.degraded_centroid.tolist() if model.degraded_centroid is not None else [],
                per_feature_dispersion=model.degraded_dispersion,
                feature_names=feature_names,
                warnings=[],
            ),
        }

        # Stage 15: Calculate restored scores
        report("Calculating recovery scores", 66, None)
        recovery_scores = calculate_recovery_scores(
            model, restored_features, restored_ids, feature_names,
            configuration.distance_metric,
        )

        # Stage 16: Aggregate
        score_agg = aggregate_scores(recovery_scores)
        project_score = score_agg.get("median")

        # Track dated period observations from recovery scores.
        for rs in recovery_scores:
            rec_meta = next((r for r in recordings if r.get("recording_id") == rs.recording_id), {})
            period = rec_meta.get("monitoring_period") or "Unspecified period"
            if rs.recovery_score is not None:
                period_observations.setdefault(period, []).append((rs.recovery_score, rec_meta.get("timestamp")))

        # Stage 17: Evidence consistency
        report("Calculating confidence", 74, None)
        avg_agreement = None
        agreements = [s.feature_agreement for s in recovery_scores if s.feature_agreement is not None]
        if agreements:
            avg_agreement = float(np.mean(agreements))

        # Stage 18: Bootstrap
        report("Running bootstrap", 76, None)
        bootstrap_iterations = configuration.bootstrap_iterations
        if bootstrap_iterations > 0 and len(healthy_features) >= configuration.minimum_recordings_per_reference_group \
                and len(degraded_features) >= configuration.minimum_recordings_per_reference_group:
            bootstrap_result = run_bootstrap(
                healthy_features, degraded_features, restored_features,
                healthy_ids, degraded_ids, restored_ids,
                feature_names,
                n_iterations=bootstrap_iterations,
                random_seed=configuration.random_seed,
                scaling_method=configuration.reference_scaling,
                distance_metric=configuration.distance_metric,
                minimum_per_group=configuration.minimum_recordings_per_reference_group,
            )

        bs_std = bootstrap_result.std if bootstrap_result else None
        bs_available = bootstrap_result is not None and bootstrap_result.successful_iterations > 0

        confidence_result = calculate_evidence_consistency(
            feature_agreement=avg_agreement,
            restored_scores=recovery_scores,
            healthy_count=len(healthy_ids),
            degraded_count=len(degraded_ids),
            restored_count=len(restored_ids),
            total_recordings=total,
            excluded_count=len(excluded_ids) + failed_count,
            bootstrap_std=bs_std,
            bootstrap_available=bs_available,
            minimum_per_group=configuration.minimum_recordings_per_reference_group,
        )

    except InsufficientReferenceDataError as e:
        warnings.append(f"Reference modelling unavailable: {e}")

    # Stage 19: Temporal analysis
    report("Temporal analysis", 88, None)
    temporal_result = calculate_temporal_analysis(
        period_observations,
        min_periods=3,
        min_recordings_per_period=1,
        stable_threshold_per_year=configuration.temporal_stable_threshold_per_year,
        strong_threshold_per_year=configuration.temporal_strong_threshold_per_year,
        bootstrap_iterations=configuration.temporal_bootstrap_iterations,
        random_seed=configuration.random_seed,
    )

    # Stage 20: Provenance
    report("Producing provenance", 92, None)
    completion_time = datetime.now(timezone.utc)

    excluded_recordings = {rid: "failed" for rid in excluded_ids}
    for rec in recording_results:
        if rec.quality_status == "failed":
            excluded_recordings[rec.recording_id] = "; ".join(rec.errors) if rec.errors else "failed"

    input_checksums = {r.recording_id: r.input_checksum for r in recording_results if r.input_checksum}
    original_filenames = {r.recording_id: r.recording_id for r in recording_results}

    provenance = create_provenance(
        project_id=project_id,
        analysis_job_id=analysis_job_id,
        recording_ids=[r.recording_id for r in recording_results],
        input_checksums=input_checksums,
        original_filenames=original_filenames,
        configuration=config_dict,
        random_seed=configuration.random_seed,
        software_version=configuration.software_version,
        dependency_versions=get_dependency_versions(),
        preprocessing_operations=[
            f"channel_mode={configuration.channel_mode}",
            f"remove_dc_offset={configuration.remove_dc_offset}",
            f"resample_to={configuration.target_sample_rate}",
            f"normalization={configuration.amplitude_normalization}",
        ],
        included_features=feature_names,
        dropped_features=[f for f in DEFAULT_FEATURE_NAMES if f not in feature_names],
        scaler_parameters=None,
        distance_metric=configuration.distance_metric,
        reference_recording_ids={
            "healthy": healthy_ids,
            "degraded": degraded_ids,
        },
        restored_recording_ids=restored_ids,
        excluded_recordings=excluded_recordings,
        start_time=start_time,
        completion_time=completion_time,
        warnings=warnings,
        errors=errors,
    )

    # Build final result
    result = ProjectAnalysisResult(
        project_id=project_id,
        analysis_job_id=analysis_job_id,
        configuration=config_dict,
        recording_results=recording_results,
        reference_profiles=reference_profiles,
        recovery_scores=recovery_scores,
        project_recovery_score=project_score,
        confidence=confidence_result or __import__("app.analysis.schemas", fromlist=["ConfidenceResult"]).ConfidenceResult(),
        bootstrap=bootstrap_result,
        temporal=temporal_result,
        provenance=provenance,
        feature_names=feature_names,
        included_recording_ids=restored_ids,
        excluded_recording_ids=excluded_ids,
        total_recordings=total,
        processed_recordings=total - failed_count,
        failed_recordings=failed_count,
        excluded_recordings=len(excluded_ids),
        warnings=warnings,
        errors=errors,
    )

    # Stage 21: Export
    report("Exporting results", 95, None)
    export_results(result, output_directory)

    report("Complete", 100, None)
    return result


# CLI entry point
def main():
    """Command-line interface for running analysis without the web app."""
    import argparse
    import csv
    import json
    import sys

    parser = argparse.ArgumentParser(description="Run AcoustiMap Restore audio analysis pipeline")
    parser.add_argument("--project-id", required=True, help="Project ID")
    parser.add_argument("--recordings-manifest", required=True, help="CSV manifest of recordings")
    parser.add_argument("--audio-dir", required=True, help="Directory containing audio files")
    parser.add_argument("--config", help="JSON configuration file (optional)")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    args = parser.parse_args()

    # Load configuration
    if args.config:
        with open(args.config) as f:
            config_data = json.load(f)
        configuration = AnalysisConfig(**config_data)
    else:
        configuration = AnalysisConfig()

    # Load manifest
    recordings = []
    with open(args.recordings_manifest) as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["file_path"] = str(Path(args.audio_dir) / row["filename"])
            recordings.append(row)

    # Run pipeline
    def progress(stage, pct, current):
        print(f"  [{pct:5.1f}%] {stage}")

    result = run_project_analysis(
        project_id=args.project_id,
        recordings=recordings,
        configuration=configuration,
        output_directory=args.output_dir,
        progress_callback=progress,
    )

    # Print summary
    print(f"\nAnalysis complete.")
    print(f"  Processed: {result.processed_recordings}/{result.total_recordings}")
    print(f"  Failed: {result.failed_recordings}")
    print(f"  Features: {', '.join(result.feature_names)}")
    print(f"  Recovery score: {result.project_recovery_score}")
    print(f"  Confidence: {result.confidence.confidence_label}")
    print(f"  Output: {args.output_dir}")

    if result.errors:
        print(f"\nErrors ({len(result.errors)}):")
        for e in result.errors[:5]:
            print(f"  - {e}")

    if result.failed_recordings > 0 and result.processed_recordings == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
