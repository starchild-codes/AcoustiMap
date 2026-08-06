"""
Provenance: complete audit trail for analysis results.

Records everything needed for another researcher to inspect
how a result was produced.
"""

import sys
import platform
from datetime import datetime, timezone


def create_provenance(
    project_id: str,
    analysis_job_id: str,
    recording_ids: list[str],
    input_checksums: dict[str, str],
    original_filenames: dict[str, str],
    configuration: dict,
    random_seed: int,
    software_version: str,
    dependency_versions: dict[str, str],
    preprocessing_operations: list[str],
    included_features: list[str],
    dropped_features: list[str],
    scaler_parameters: dict | None,
    distance_metric: str,
    reference_recording_ids: dict[str, list[str]],
    restored_recording_ids: list[str],
    excluded_recordings: dict[str, str],
    start_time: datetime,
    completion_time: datetime,
    warnings: list[str],
    errors: list[str],
) -> dict:
    """
    Create a complete provenance record.
    """
    runtime = (completion_time - start_time).total_seconds()

    return {
        "analysis_job_id": analysis_job_id,
        "project_id": project_id,
        "recording_ids": recording_ids,
        "input_checksums": input_checksums,
        "original_filenames": original_filenames,
        "software_version": software_version,
        "python_version": sys.version,
        "platform": platform.platform(),
        "dependency_versions": dependency_versions,
        "configuration": configuration,
        "random_seed": random_seed,
        "preprocessing_operations": preprocessing_operations,
        "included_features": included_features,
        "dropped_features": dropped_features,
        "scaler_parameters": scaler_parameters,
        "distance_metric": distance_metric,
        "reference_recording_ids": reference_recording_ids,
        "restored_recording_ids": restored_recording_ids,
        "excluded_recordings": excluded_recordings,
        "start_timestamp": start_time.isoformat(),
        "completion_timestamp": completion_time.isoformat(),
        "runtime_seconds": runtime,
        "warnings": warnings,
        "errors": errors,
    }


def get_dependency_versions() -> dict[str, str]:
    """Get versions of key dependencies."""
    versions = {}
    for pkg in ["numpy", "scipy", "librosa", "sklearn", "soundfile", "matplotlib", "pandas"]:
        try:
            mod = __import__(pkg)
            versions[pkg] = getattr(mod, "__version__", "unknown")
        except ImportError:
            versions[pkg] = "not installed"
    return versions
