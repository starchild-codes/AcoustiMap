"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
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

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, value: str | None) -> str | None:
        return _validated_timestamp(value)


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

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, value: str | None) -> str | None:
        return _validated_timestamp(value)


class AnalysisConfigBase(BaseModel):
    name: str
    is_default: bool = False
    target_sample_rate: int = Field(default=22050, ge=8000, le=192000)
    target_channel_mode: str = "mono"
    clip_duration: float = Field(default=60.0, gt=0)
    start_offset: float = Field(default=0.0, ge=0)
    freq_min: float = Field(default=0.0, ge=0)
    freq_max: float = Field(default=11025.0, gt=0)
    fft_size: int = Field(default=2048, ge=256)
    window_size: int = Field(default=2048, ge=256)
    hop_length: int = Field(default=512, ge=1)
    aci_freq_step: float = 1000.0
    aci_time_step: float = 1.0
    biological_band_min_hz: float = 2000.0
    biological_band_max_hz: float = 8000.0
    silence_threshold: float = 0.001
    clipping_threshold: float = Field(default=0.99, gt=0, lt=1)
    low_freq_noise_threshold: float = Field(default=0.7, ge=0, le=1)
    normalisation_method: str = "none"
    similarity_scaling_method: str = "standard"
    random_seed: int = Field(default=42, ge=0)
    bootstrap_iterations: int = Field(default=500, ge=0, le=2000)
    temporal_bootstrap_iterations: int = Field(default=500, ge=0, le=2000)
    temporal_stable_threshold_per_year: float = Field(default=1.0, ge=0)
    temporal_strong_threshold_per_year: float = Field(default=5.0, ge=0)
    software_version: str = "1.0.0"

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.freq_min >= self.freq_max:
            raise ValueError("freq_min must be lower than freq_max")
        if self.freq_max > self.target_sample_rate / 2:
            raise ValueError("freq_max must not exceed the Nyquist frequency")
        if self.hop_length > self.fft_size:
            raise ValueError("hop_length must not exceed fft_size")
        if self.biological_band_min_hz >= self.biological_band_max_hz:
            raise ValueError("biological_band_min_hz must be lower than biological_band_max_hz")
        if self.temporal_strong_threshold_per_year < self.temporal_stable_threshold_per_year:
            raise ValueError("temporal strong threshold must be at least the stable threshold")
        if self.target_channel_mode not in ("mono", "stereo"):
            raise ValueError("target_channel_mode must be mono or stereo")
        if self.normalisation_method not in ("none", "peak", "rms"):
            raise ValueError("normalisation_method must be none, peak, or rms")
        if self.similarity_scaling_method not in ("none", "standard", "robust"):
            raise ValueError("similarity_scaling_method must be none, standard, or robust")
        return self


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
    biological_band_min_hz: float | None = None
    biological_band_max_hz: float | None = None
    silence_threshold: float | None = None
    clipping_threshold: float | None = None
    low_freq_noise_threshold: float | None = None
    normalisation_method: str | None = None
    similarity_scaling_method: str | None = None
    random_seed: int | None = None
    bootstrap_iterations: int | None = Field(default=None, ge=0, le=2000)
    temporal_bootstrap_iterations: int | None = Field(default=None, ge=0, le=2000)
    temporal_stable_threshold_per_year: float | None = Field(default=None, ge=0)
    temporal_strong_threshold_per_year: float | None = Field(default=None, ge=0)


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
    recording_ids: list[str]
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
    new_status: QualityStatus
    reason: str = Field(default="", max_length=2000)
    reviewer_notes: str = Field(default="", max_length=5000)


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
    median_distance_to_healthy: float | None
    median_distance_to_degraded: float | None
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
    bootstrap_requested_iterations: int
    included_recording_ids: list
    excluded_recording_ids: list
    feature_names: list
    scaling_method: str
    warnings: list
    reference_profiles: dict
    temporal_result: dict
    calculated_at: datetime

    class Config:
        from_attributes = True


def _validated_timestamp(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    candidate = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as exc:
        raise ValueError("timestamp must be a valid ISO 8601 date/time") from exc
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.isoformat()
