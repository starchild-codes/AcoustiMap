"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from pydantic import BaseModel, Field
from app.models.models import ProjectStatus, PrivacyLevel, SiteType, JobState, QualityStatus, FlagSeverity


class ProjectBase(BaseModel):
    name: str
    description: str = ""
    ecosystem_type: str = ""
    country: str = ""
    region: str = ""
    latitude: float | None = None
    longitude: float | None = None
    restoration_intervention: str = ""
    intervention_date: str | None = None
    monitoring_start: str | None = None
    monitoring_end: str | None = None
    status: ProjectStatus = ProjectStatus.draft
    privacy: PrivacyLevel = PrivacyLevel.private
    organisation: str = ""
    primary_contact: str = ""
    scientific_notes: str = ""
    is_demo: bool = False


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    ecosystem_type: str | None = None
    country: str | None = None
    region: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    restoration_intervention: str | None = None
    intervention_date: str | None = None
    monitoring_start: str | None = None
    monitoring_end: str | None = None
    status: ProjectStatus | None = None
    privacy: PrivacyLevel | None = None
    organisation: str | None = None
    primary_contact: str | None = None
    scientific_notes: str | None = None


class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SiteBase(BaseModel):
    name: str
    site_type: SiteType
    latitude: float | None = None
    longitude: float | None = None
    habitat_description: str = ""
    recorder_id: str = ""
    recorder_model: str = ""
    deployment_date: str | None = None
    mic_height_depth: float | None = None
    distance_to_noise: float | None = None
    notes: str = ""
    is_active: bool = True


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    name: str | None = None
    site_type: SiteType | None = None
    latitude: float | None = None
    longitude: float | None = None
    habitat_description: str | None = None
    recorder_id: str | None = None
    recorder_model: str | None = None
    deployment_date: str | None = None
    mic_height_depth: float | None = None
    distance_to_noise: float | None = None
    notes: str | None = None
    is_active: bool | None = None


class SiteResponse(SiteBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordingCreate(BaseModel):
    filename: str
    habitat_category: SiteType
    site_id: str | None = None
    timestamp: str | None = None
    monitoring_period: str = ""
    recorder_id: str = ""
    notes: str = ""


class RecordingResponse(BaseModel):
    id: str
    project_id: str
    site_id: str | None
    filename: str
    file_size: int
    mime_type: str
    checksum: str
    habitat_category: SiteType
    timestamp: str | None
    monitoring_period: str
    recorder_id: str
    notes: str
    uploaded_at: datetime
    has_audio_file: bool = True

    class Config:
        from_attributes = True


class RecordingUpdate(BaseModel):
    habitat_category: SiteType | None = None
    site_id: str | None = None
    timestamp: str | None = None
    monitoring_period: str | None = None
    recorder_id: str | None = None
    notes: str | None = None


class AnalysisConfigBase(BaseModel):
    name: str
    is_default: bool = False
    target_sample_rate: int = 22050
    target_channel_mode: str = "mono"
    clip_duration: float = 60.0
    start_offset: float = 0.0
    freq_min: float = 0.0
    freq_max: float = 11025.0
    fft_size: int = 2048
    window_size: int = 2048
    hop_length: int = 512
    aci_freq_step: float = 1000.0
    aci_time_step: float = 1.0
    bi_freq_min: float = 2000.0
    bi_freq_max: float = 8000.0
    silence_threshold: float = 0.001
    clipping_threshold: float = 0.99
    low_freq_noise_threshold: float = 0.7
    normalisation_method: str = "none"
    similarity_scaling_method: str = "standard"
    random_seed: int = 42
    software_version: str = "1.0.0"


class AnalysisConfigCreate(AnalysisConfigBase):
    pass


class AnalysisConfigUpdate(BaseModel):
    name: str | None = None
    is_default: bool | None = None
    target_sample_rate: int | None = None
    target_channel_mode: str | None = None
    clip_duration: float | None = None
    start_offset: float = None
    freq_min: float | None = None
    freq_max: float | None = None
    fft_size: int | None = None
    window_size: int | None = None
    hop_length: int | None = None
    aci_freq_step: float | None = None
    aci_time_step: float | None = None
    bi_freq_min: float | None = None
    bi_freq_max: float | None = None
    silence_threshold: float | None = None
    clipping_threshold: float | None = None
    low_freq_noise_threshold: float | None = None
    normalisation_method: str | None = None
    similarity_scaling_method: str | None = None
    random_seed: int | None = None


class AnalysisConfigResponse(AnalysisConfigBase):
    id: str
    project_id: str
    is_demo: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConfigValidationWarning(BaseModel):
    code: str
    message: str


class AnalysisConfigWithWarnings(AnalysisConfigResponse):
    warnings: list[ConfigValidationWarning] = []


class AnalysisJobCreate(BaseModel):
    config_id: str
    recording_ids: list[str] | None = None  # None = all unanalysed


class AnalysisJobResponse(BaseModel):
    id: str
    project_id: str
    config_id: str
    state: JobState
    total_recordings: int
    processed_recordings: int
    failed_recordings: int
    current_recording_id: str | None
    current_stage: str
    progress_percent: float
    error_summary: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class QualityFlagResponse(BaseModel):
    id: str
    flag_code: str
    severity: FlagSeverity
    measured_value: str
    threshold: str
    explanation: str
    recommended_action: str
    created_at: datetime

    class Config:
        from_attributes = True


class ManualReviewCreate(BaseModel):
    new_status: str
    reason: str = ""
    reviewer_notes: str = ""


class ManualReviewResponse(BaseModel):
    id: str
    previous_status: str
    new_status: str
    reason: str
    reviewer_notes: str
    created_at: datetime

    class Config:
        from_attributes = True


class RecordingAnalysisResponse(BaseModel):
    id: str
    recording_id: str
    job_id: str
    config_id: str
    analysis_version: str
    processed_at: datetime
    input_checksum: str
    runtime_seconds: float
    software_version: str
    is_active: bool
    technical_features: dict
    ecoacoustic_features: dict
    comparison: dict
    quality_info: dict
    artifacts: dict
    errors_warnings: list
    quality_flags: list[QualityFlagResponse] = []
    manual_reviews: list[ManualReviewResponse] = []

    class Config:
        from_attributes = True


class ProjectSummaryResponse(BaseModel):
    id: str
    project_id: str
    config_id: str
    recovery_score: float | None
    healthy_similarity: float | None
    degraded_similarity: float | None
    improvement_over_degraded: float | None
    evidence_consistency: float | None
    confidence_label: str
    confidence_reasons: list
    bootstrap_median: float | None
    bootstrap_mean: float | None
    bootstrap_std: float | None
    bootstrap_ci_low: float | None
    bootstrap_ci_high: float | None
    bootstrap_iterations: int
    included_recording_ids: list
    excluded_recording_ids: list
    feature_names: list
    scaling_method: str
    warnings: list
    calculated_at: datetime

    class Config:
        from_attributes = True
