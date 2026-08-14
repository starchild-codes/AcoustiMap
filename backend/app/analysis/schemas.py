"""
Pydantic schemas for structured analysis outputs.

These are the data structures that flow through the pipeline and are
saved as JSON files and database rows.
"""

from pydantic import BaseModel, Field
from typing import Any


class AudioMetadata(BaseModel):
    """Metadata retrieved during audio loading."""
    original_sample_rate: int | None = None
    channel_count: int | None = None
    frame_count: int | None = None
    duration_seconds: float | None = None
    subtype: str | None = None
    file_size_bytes: int = 0
    checksum: str = ""
    filename: str = ""


class PreprocessingMetadata(BaseModel):
    """Metadata from the preprocessing stage."""
    original_sample_rate: int = 0
    target_sample_rate: int = 0
    channel_mode: str = "mono"
    original_channels: int = 1
    dc_offset_removed: bool = False
    dc_offset_value: float = 0.0
    amplitude_normalization: str = "none"
    normalization_gain: float = 1.0
    resampled: bool = False
    processed_duration_seconds: float = 0.0
    processed_sample_count: int = 0


class SegmentInfo(BaseModel):
    """Information about a single segment."""
    segment_id: str
    index: int
    start_time: float
    end_time: float
    duration: float
    sample_count: int
    is_valid: bool = True
    exclusion_reason: str | None = None


class TechnicalFeatures(BaseModel):
    """Technical audio-quality metrics."""
    duration: float | None = None
    peak_amplitude: float | None = None
    rms_amplitude: float | None = None
    rms_dbfs: float | None = None
    mean_amplitude: float | None = None
    dc_offset: float | None = None
    crest_factor: float | None = None
    zero_crossing_rate: float | None = None
    clipping_sample_count: int | None = None
    clipping_proportion: float | None = None
    silence_proportion: float | None = None
    silence_frame_count: int | None = None
    silence_total_frames: int | None = None
    dynamic_range_db: float | None = None
    low_frequency_energy_proportion: float | None = None
    mid_frequency_energy_proportion: float | None = None
    high_frequency_energy_proportion: float | None = None
    spectral_centroid_hz: float | None = None
    spectral_bandwidth_hz: float | None = None
    spectral_rolloff_hz: float | None = None
    spectral_flatness: float | None = None
    channel_count: int | None = None
    original_sample_rate: int | None = None
    processed_sample_rate: int | None = None


class EcoacousticFeatures(BaseModel):
    """Ecoacoustic indices."""
    aci: float | None = None
    aci_by_band: dict[str, float] | None = None
    biological_band_spectral_magnitude_ratio: float | None = None
    spectral_entropy: float | None = None
    temporal_entropy: float | None = None
    biological_band_occupancy: float | None = None
    ndsi: float | None = None
    anthropogenic_noise_pressure: float | None = None
    biophony_energy: float | None = None
    anthrophony_energy: float | None = None
    adi: float | None = None
    aei: float | None = None


class QualityFlag(BaseModel):
    """A single quality-control flag."""
    code: str
    severity: str  # info, review, exclude_recommended, fatal
    message: str
    measured_value: float | str | None = None
    threshold: float | str | None = None
    recommended_action: str = ""


class SegmentResult(BaseModel):
    """Complete result for a single segment."""
    segment_id: str
    segment_info: SegmentInfo
    technical: TechnicalFeatures
    ecoacoustic: EcoacousticFeatures
    quality_flags: list[QualityFlag] = []
    errors: list[str] = []


class RecordingResult(BaseModel):
    """Complete result for a single recording (aggregated from segments)."""
    recording_id: str
    analysis_version: str = "1.0.0"
    configuration_id: str = ""
    quality_status: str = "valid"
    technical: TechnicalFeatures
    ecoacoustic: EcoacousticFeatures
    quality_flags: list[QualityFlag] = []
    artifacts: dict[str, Any] = {}
    segment_results: list[SegmentResult] = []
    errors: list[str] = []
    warnings: list[str] = []
    valid_segment_count: int = 0
    failed_segment_count: int = 0
    runtime_seconds: float = 0.0
    input_checksum: str = ""


class ReferenceProfile(BaseModel):
    """Reference profile for a habitat category."""
    habitat: str
    recording_ids: list[str] = []
    group_size: int = 0
    centroid: list[float] = []
    per_feature_dispersion: list[float] = []
    feature_names: list[str] = []
    warnings: list[str] = []


class RecoveryScoreResult(BaseModel):
    """Recovery score for a single restored recording."""
    recording_id: str
    distance_to_healthy: float | None = None
    distance_to_degraded: float | None = None
    recovery_position: float | None = None
    recovery_score: float | None = None
    projection_score: float | None = None
    projection_raw: float | None = None
    feature_agreement: float | None = None
    supporting_features: int = 0
    opposing_features: int = 0
    unavailable_features: int = 0
    feature_details: list[dict] = []


class ConfidenceResult(BaseModel):
    """Evidence consistency and confidence label."""
    evidence_consistency: float | None = None
    confidence_label: str = "Insufficient evidence"
    confidence_reasons: list[str] = []
    reasons_increasing: list[str] = []
    reasons_reducing: list[str] = []
    unmet_next_level: list[str] = []
    components: dict[str, float | None] = {}


class BootstrapResult(BaseModel):
    """Bootstrap uncertainty results."""
    requested_iterations: int = 0
    successful_iterations: int = 0
    failed_iterations: int = 0
    mean: float | None = None
    median: float | None = None
    std: float | None = None
    ci_2_5: float | None = None
    ci_25: float | None = None
    ci_75: float | None = None
    ci_97_5: float | None = None
    random_seed: int = 42


class ProjectAnalysisResult(BaseModel):
    """Complete project-level analysis result."""
    project_id: str
    analysis_job_id: str = ""
    configuration: dict[str, Any] = {}
    recording_results: list[RecordingResult] = []
    reference_profiles: dict[str, ReferenceProfile] = {}
    recovery_scores: list[RecoveryScoreResult] = []
    project_recovery_score: float | None = None
    project_score_median: float | None = None
    project_score_iqr: float | None = None
    confidence: ConfidenceResult = ConfidenceResult()
    bootstrap: BootstrapResult | None = None
    temporal: dict[str, Any] | None = None
    ablation: list[dict] = []
    provenance: dict[str, Any] = {}
    feature_names: list[str] = []
    included_recording_ids: list[str] = []
    excluded_recording_ids: list[str] = []
    total_recordings: int = 0
    processed_recordings: int = 0
    failed_recordings: int = 0
    excluded_recordings: int = 0
    warnings: list[str] = []
    errors: list[str] = []
