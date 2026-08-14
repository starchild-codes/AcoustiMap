"""Integration test: full pipeline with synthetic recordings."""

import pytest
import numpy as np
import tempfile
import os
from pathlib import Path

from app.analysis.config import AnalysisConfig
from app.analysis.pipeline import run_project_analysis
from tests.analysis.fixtures import (
    create_test_fixtures, generate_sine_wave, generate_white_noise,
    generate_silence, generate_clipped_sine,
)


@pytest.fixture
def integration_setup():
    """Create a complete test project with synthetic recordings."""
    with tempfile.TemporaryDirectory() as tmpdir:
        fixtures = create_test_fixtures(tmpdir)

        # Create recordings: 3 healthy, 3 degraded, 3 restored, 1 silent, 1 clipped
        recordings = []

        # Healthy: high-frequency content (simulating diverse biological sound)
        for i in range(3):
            recordings.append({
                "recording_id": f"healthy_{i:03d}",
                "file_path": fixtures["multitone"],
                "filename": f"healthy_{i:03d}.wav",
                "habitat_category": "healthy",
                "site_id": "healthy_site",
                "timestamp": "2026-01-01T06:00:00Z",
                "monitoring_period": "baseline",
            })

        # Degraded: low-frequency content (simulating degraded habitat)
        for i in range(3):
            recordings.append({
                "recording_id": f"degraded_{i:03d}",
                "file_path": fixtures["sine_200hz"],
                "filename": f"degraded_{i:03d}.wav",
                "habitat_category": "degraded",
                "site_id": "degraded_site",
                "timestamp": "2026-01-01T06:00:00Z",
                "monitoring_period": "baseline",
            })

        # Restored: mid-frequency content (between healthy and degraded)
        for i in range(3):
            recordings.append({
                "recording_id": f"restored_{i:03d}",
                "file_path": fixtures["sine_2000hz"],
                "filename": f"restored_{i:03d}.wav",
                "habitat_category": "restored",
                "site_id": "restored_site",
                "timestamp": "2026-02-01T06:00:00Z",
                "monitoring_period": "month_1",
            })

        # Silent recording (should get quality warnings)
        recordings.append({
            "recording_id": "silent_001",
            "file_path": fixtures["silence"],
            "filename": "silent_001.wav",
            "habitat_category": "restored",
            "site_id": "restored_site",
            "timestamp": "2026-02-01T06:00:00Z",
            "monitoring_period": "month_1",
        })

        # Clipped recording (should get quality warnings)
        recordings.append({
            "recording_id": "clipped_001",
            "file_path": fixtures["clipped"],
            "filename": "clipped_001.wav",
            "habitat_category": "restored",
            "site_id": "restored_site",
            "timestamp": "2026-02-01T06:00:00Z",
            "monitoring_period": "month_1",
        })

        output_dir = str(Path(tmpdir) / "outputs")

        config = AnalysisConfig(
            segment_duration_seconds=10.0,
            minimum_valid_duration_seconds=3.0,
            bootstrap_iterations=20,
            minimum_recordings_per_reference_group=3,
        )

        yield recordings, config, output_dir, tmpdir


def test_full_pipeline(integration_setup):
    """Run the entire pipeline and verify results."""
    recordings, config, output_dir, tmpdir = integration_setup

    result = run_project_analysis(
        project_id="test_project",
        recordings=recordings,
        configuration=config,
        output_directory=output_dir,
        analysis_job_id="test_job",
    )

    # Basic counts
    assert result.total_recordings == 11
    assert result.processed_recordings > 0
    assert result.failed_recordings == 0  # All files are valid WAVs

    # Silent recording should have quality warnings
    silent_rec = next(r for r in result.recording_results if r.recording_id == "silent_001")
    assert silent_rec.quality_status in ("review", "exclude_recommended")
    flag_codes = [f.code for f in silent_rec.quality_flags]
    assert "NEAR_SILENCE" in flag_codes or "HIGH_SILENCE_PROPORTION" in flag_codes

    # Clipped recording should have clipping warning
    clipped_rec = next(r for r in result.recording_results if r.recording_id == "clipped_001")
    clipped_codes = [f.code for f in clipped_rec.quality_flags]
    assert "EXCESSIVE_CLIPPING" in clipped_codes

    # Valid recordings should produce features
    healthy_rec = next(r for r in result.recording_results if r.recording_id == "healthy_000")
    assert healthy_rec.ecoacoustic.aci is not None
    assert healthy_rec.ecoacoustic.biological_band_spectral_magnitude_ratio is not None

    # Reference profiles should be built
    assert "healthy" in result.reference_profiles
    assert "degraded" in result.reference_profiles
    assert len(result.reference_profiles["healthy"].recording_ids) >= 3

    # Recovery scores should be calculated
    assert len(result.recovery_scores) > 0
    restored_scores = [s for s in result.recovery_scores if s.recording_id.startswith("restored")]
    assert len(restored_scores) >= 3

    # Project score should exist
    assert result.project_recovery_score is not None

    # Confidence should be assigned
    assert result.confidence.confidence_label != ""

    # Bootstrap should have results
    assert result.bootstrap is not None
    assert result.bootstrap.successful_iterations > 0

    # Provenance should exist
    assert "analysis_job_id" in result.provenance
    assert "input_checksums" in result.provenance

    # Output files should exist
    assert os.path.exists(output_dir)
    assert os.path.exists(os.path.join(output_dir, "project_analysis.json"))
    assert os.path.exists(os.path.join(output_dir, "recording_features.csv"))
    assert os.path.exists(os.path.join(output_dir, "provenance.json"))
    assert os.path.exists(os.path.join(output_dir, "run_summary.txt"))

    # Artifacts should be generated for valid recordings
    artifacts_dir = Path(output_dir) / "artifacts"
    assert artifacts_dir.exists()


def test_pipeline_handles_corrupt_file(integration_setup):
    """Corrupt file fails without stopping other recordings."""
    recordings, config, output_dir, tmpdir = integration_setup

    # Add a corrupt file
    corrupt_path = str(Path(tmpdir) / "corrupt.wav")
    with open(corrupt_path, "wb") as f:
        f.write(b"This is not valid audio")

    recordings.append({
        "recording_id": "corrupt_001",
        "file_path": corrupt_path,
        "filename": "corrupt_001.wav",
        "habitat_category": "restored",
        "site_id": "restored_site",
        "timestamp": "2026-02-01T06:00:00Z",
        "monitoring_period": "month_1",
    })

    result = run_project_analysis(
        project_id="test_project_corrupt",
        recordings=recordings,
        configuration=config,
        output_directory=output_dir,
        analysis_job_id="test_job_corrupt",
    )

    # Corrupt file should fail
    corrupt_rec = next(r for r in result.recording_results if r.recording_id == "corrupt_001")
    assert corrupt_rec.quality_status == "failed"

    # Other recordings should still be processed
    assert result.processed_recordings > 0
    assert result.failed_recordings >= 1
