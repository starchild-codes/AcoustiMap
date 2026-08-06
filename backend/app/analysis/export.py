"""
Export: save structured analysis results to files.

Produces the output directory structure:
    outputs/{project_id}/{analysis_job_id}/
    ├── project_analysis.json
    ├── recording_features.csv
    ├── segment_features.csv
    ├── quality_flags.csv
    ├── reference_profiles.json
    ├── recovery_scores.csv
    ├── confidence_breakdown.json
    ├── bootstrap_results.json
    ├── temporal_analysis.json
    ├── ablation_results.csv
    ├── provenance.json
    ├── analysis_config.json
    ├── run_summary.txt
    └── artifacts/
        ├── waveforms/
        └── spectrograms/
"""

import json
import csv
import os
from pathlib import Path
from typing import Any
import logging

from .schemas import ProjectAnalysisResult

logger = logging.getLogger(__name__)


def export_results(
    result: ProjectAnalysisResult,
    output_directory: str,
) -> str:
    """
    Export all analysis results to structured files.

    Returns the path to the output directory.
    """
    out_dir = Path(output_directory)
    out_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir = out_dir / "artifacts"
    (artifacts_dir / "waveforms").mkdir(exist_ok=True)
    (artifacts_dir / "spectrograms").mkdir(exist_ok=True)

    # project_analysis.json
    _write_json(result.model_dump(), out_dir / "project_analysis.json")

    # recording_features.csv
    _write_recording_features_csv(result, out_dir / "recording_features.csv")

    # segment_features.csv
    _write_segment_features_csv(result, out_dir / "segment_features.csv")

    # quality_flags.csv
    _write_quality_flags_csv(result, out_dir / "quality_flags.csv")

    # reference_profiles.json
    _write_reference_profiles(result, out_dir / "reference_profiles.json")

    # recovery_scores.csv
    _write_recovery_scores_csv(result, out_dir / "recovery_scores.csv")

    # confidence_breakdown.json
    _write_json(result.confidence.model_dump(), out_dir / "confidence_breakdown.json")

    # bootstrap_results.json
    if result.bootstrap:
        _write_json(result.bootstrap.model_dump(), out_dir / "bootstrap_results.json")

    # temporal_analysis.json
    if result.temporal:
        _write_json(result.temporal, out_dir / "temporal_analysis.json")

    # ablation_results.csv
    if result.ablation:
        _write_ablation_csv(result.ablation, out_dir / "ablation_results.csv")

    # provenance.json
    _write_json(result.provenance, out_dir / "provenance.json")

    # analysis_config.json
    _write_json(result.configuration, out_dir / "analysis_config.json")

    # run_summary.txt
    _write_run_summary(result, out_dir / "run_summary.txt")

    return str(out_dir)


def _write_json(data: Any, path: Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _write_recording_features_csv(result: ProjectAnalysisResult, path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["recording_id", "quality_status", "duration", "rms", "peak", "zcr",
                         "aci", "bi", "spectral_entropy", "temporal_entropy",
                         "occupancy", "ndsi", "noise_pressure",
                         "valid_segments", "failed_segments"])
        for rec in result.recording_results:
            writer.writerow([
                rec.recording_id, rec.quality_status,
                rec.technical.duration, rec.technical.rms_amplitude,
                rec.technical.peak_amplitude, rec.technical.zero_crossing_rate,
                rec.ecoacoustic.aci, rec.ecoacoustic.bi,
                rec.ecoacoustic.spectral_entropy, rec.ecoacoustic.temporal_entropy,
                rec.ecoacoustic.biological_band_occupancy,
                rec.ecoacoustic.ndsi, rec.ecoacoustic.anthropogenic_noise_pressure,
                rec.valid_segment_count, rec.failed_segment_count,
            ])


def _write_segment_features_csv(result: ProjectAnalysisResult, path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["segment_id", "recording_id", "index", "start_time", "end_time",
                         "duration", "is_valid", "aci", "bi", "spectral_entropy",
                         "temporal_entropy", "occupancy", "ndsi"])
        for rec in result.recording_results:
            for seg in rec.segment_results:
                writer.writerow([
                    seg.segment_id, rec.recording_id, seg.segment_info.index,
                    seg.segment_info.start_time, seg.segment_info.end_time,
                    seg.segment_info.duration, seg.segment_info.is_valid,
                    seg.ecoacoustic.aci, seg.ecoacoustic.bi,
                    seg.ecoacoustic.spectral_entropy, seg.ecoacoustic.temporal_entropy,
                    seg.ecoacoustic.biological_band_occupancy, seg.ecoacoustic.ndsi,
                ])


def _write_quality_flags_csv(result: ProjectAnalysisResult, path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["recording_id", "segment_id", "code", "severity", "message",
                         "measured_value", "threshold", "recommended_action"])
        for rec in result.recording_results:
            for flag in rec.quality_flags:
                writer.writerow([
                    rec.recording_id, "", flag.code, flag.severity, flag.message,
                    flag.measured_value, flag.threshold, flag.recommended_action,
                ])
            for seg in rec.segment_results:
                for flag in seg.quality_flags:
                    writer.writerow([
                        rec.recording_id, seg.segment_id, flag.code, flag.severity,
                        flag.message, flag.measured_value, flag.threshold,
                        flag.recommended_action,
                    ])


def _write_reference_profiles(result: ProjectAnalysisResult, path: Path) -> None:
    profiles = {}
    for habitat, profile in result.reference_profiles.items():
        profiles[habitat] = profile.model_dump()
    _write_json(profiles, path)


def _write_recovery_scores_csv(result: ProjectAnalysisResult, path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["recording_id", "distance_to_healthy", "distance_to_degraded",
                         "recovery_position", "recovery_score", "projection_score",
                         "feature_agreement", "supporting", "opposing", "unavailable"])
        for score in result.recovery_scores:
            writer.writerow([
                score.recording_id, score.distance_to_healthy, score.distance_to_degraded,
                score.recovery_position, score.recovery_score, score.projection_score,
                score.feature_agreement, score.supporting_features,
                score.opposing_features, score.unavailable_features,
            ])


def _write_ablation_csv(ablation: list[dict], path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["variant", "included_features", "recovery_score", "confidence",
                         "num_recordings", "difference_from_primary"])
        for entry in ablation:
            writer.writerow([
                entry.get("variant", ""),
                ";".join(entry.get("included_features", [])),
                entry.get("recovery_score", ""),
                entry.get("confidence", ""),
                entry.get("num_recordings", ""),
                entry.get("difference_from_primary", ""),
            ])


def _write_run_summary(result: ProjectAnalysisResult, path: Path) -> None:
    lines = [
        "AcoustiMap Restore — Analysis Run Summary",
        "=" * 50,
        "",
        f"Project: {result.project_id}",
        f"Analysis Date: {result.provenance.get('completion_timestamp', 'N/A')}",
        f"Software Version: {result.configuration.get('software_version', 'N/A')}",
        "",
        f"Recordings Requested: {result.total_recordings}",
        f"Recordings Processed: {result.processed_recordings}",
        f"Recordings Failed: {result.failed_recordings}",
        f"Recordings Excluded: {result.excluded_recordings}",
        "",
        f"Configuration: {json.dumps(result.configuration, indent=2)}",
        "",
        f"Final Usable Features: {', '.join(result.feature_names)}",
        f"Project Recovery Score: {result.project_recovery_score}",
        f"Confidence: {result.confidence.confidence_label}",
        "",
        "Major Warnings:",
    ]
    for w in result.warnings[:10]:
        lines.append(f"  - {w}")

    lines.extend([
        "",
        "Supported Interpretation:",
        "  The acoustic reference-position score indicates where restored recordings",
        "  fall relative to healthy and degraded references under the current model.",
        "  This is NOT a biodiversity measure and does NOT imply causation.",
        "",
        "Unsupported Interpretation:",
        "  This analysis does NOT support claims of species detection, total biodiversity",
        "  recovery, or causal restoration impact without additional ecological validation.",
        "",
        f"Generated by AcoustiMap Restore v{result.configuration.get('software_version', '1.0.0')}",
    ])

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
