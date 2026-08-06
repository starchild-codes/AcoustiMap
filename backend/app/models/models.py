"""SQLAlchemy ORM models for all database entities."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum, JSON, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid_str() -> str:
    return uuid.uuid4().hex


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    configuring = "configuring"
    monitoring = "monitoring"
    analysis_ready = "analysis_ready"
    review_required = "review_required"
    archived = "archived"


class PrivacyLevel(str, enum.Enum):
    public = "public"
    private = "private"
    sensitive = "sensitive"


class SiteType(str, enum.Enum):
    restored = "restored"
    degraded = "degraded"
    healthy = "healthy"


class JobState(str, enum.Enum):
    queued = "queued"
    preparing = "preparing"
    decoding = "decoding"
    calculating_quality = "calculating_quality"
    calculating_features = "calculating_features"
    generating_artifacts = "generating_artifacts"
    saving_results = "saving_results"
    completed = "completed"
    completed_with_warnings = "completed_with_warnings"
    failed = "failed"
    cancelled = "cancelled"


class QualityStatus(str, enum.Enum):
    good = "good"
    review = "review"
    excluded = "excluded"


class FlagSeverity(str, enum.Enum):
    info = "info"
    review = "review"
    exclude_recommended = "exclude_recommended"
    fatal = "fatal"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    ecosystem_type: Mapped[str] = mapped_column(String(100), default="")
    country: Mapped[str] = mapped_column(String(100), default="")
    region: Mapped[str] = mapped_column(String(255), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    restoration_intervention: Mapped[str] = mapped_column(Text, default="")
    intervention_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monitoring_start: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monitoring_end: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus), default=ProjectStatus.draft)
    privacy: Mapped[PrivacyLevel] = mapped_column(SAEnum(PrivacyLevel), default=PrivacyLevel.private)
    organisation: Mapped[str] = mapped_column(String(255), default="")
    primary_contact: Mapped[str] = mapped_column(String(255), default="")
    scientific_notes: Mapped[str] = mapped_column(Text, default="")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    sites: Mapped[list["Site"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    recordings: Mapped[list["Recording"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    configurations: Mapped[list["AnalysisConfig"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    jobs: Mapped[list["AnalysisJob"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    site_type: Mapped[SiteType] = mapped_column(SAEnum(SiteType), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    habitat_description: Mapped[str] = mapped_column(Text, default="")
    recorder_id: Mapped[str] = mapped_column(String(255), default="")
    recorder_model: Mapped[str] = mapped_column(String(255), default="")
    deployment_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mic_height_depth: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_to_noise: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    project: Mapped["Project"] = relationship(back_populates="sites")
    recordings: Mapped[list["Recording"]] = relationship(back_populates="site")


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    site_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), default="")
    checksum: Mapped[str] = mapped_column(String(64), default="")
    habitat_category: Mapped[SiteType] = mapped_column(SAEnum(SiteType), nullable=False)
    timestamp: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monitoring_period: Mapped[str] = mapped_column(String(100), default="")
    recorder_id: Mapped[str] = mapped_column(String(255), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    project: Mapped["Project"] = relationship(back_populates="recordings")
    site: Mapped["Site | None"] = relationship(back_populates="recordings")
    analyses: Mapped[list["RecordingAnalysis"]] = relationship(back_populates="recording", cascade="all, delete-orphan")


class AnalysisConfig(Base):
    __tablename__ = "analysis_configs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    target_sample_rate: Mapped[int] = mapped_column(Integer, default=22050)
    target_channel_mode: Mapped[str] = mapped_column(String(20), default="mono")
    clip_duration: Mapped[float] = mapped_column(Float, default=60.0)
    start_offset: Mapped[float] = mapped_column(Float, default=0.0)
    freq_min: Mapped[float] = mapped_column(Float, default=0.0)
    freq_max: Mapped[float] = mapped_column(Float, default=11025.0)
    fft_size: Mapped[int] = mapped_column(Integer, default=2048)
    window_size: Mapped[int] = mapped_column(Integer, default=2048)
    hop_length: Mapped[int] = mapped_column(Integer, default=512)
    aci_freq_step: Mapped[float] = mapped_column(Float, default=1000.0)
    aci_time_step: Mapped[float] = mapped_column(Float, default=1.0)
    bi_freq_min: Mapped[float] = mapped_column(Float, default=2000.0)
    bi_freq_max: Mapped[float] = mapped_column(Float, default=8000.0)
    silence_threshold: Mapped[float] = mapped_column(Float, default=0.001)
    clipping_threshold: Mapped[float] = mapped_column(Float, default=0.99)
    low_freq_noise_threshold: Mapped[float] = mapped_column(Float, default=0.7)
    normalisation_method: Mapped[str] = mapped_column(String(50), default="none")
    similarity_scaling_method: Mapped[str] = mapped_column(String(50), default="standard")
    random_seed: Mapped[int] = mapped_column(Integer, default=42)
    software_version: Mapped[str] = mapped_column(String(50), default="1.0.0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    project: Mapped["Project"] = relationship(back_populates="configurations")
    jobs: Mapped[list["AnalysisJob"]] = relationship(back_populates="config")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    config_id: Mapped[str] = mapped_column(String(32), ForeignKey("analysis_configs.id", ondelete="CASCADE"), nullable=False)
    state: Mapped[JobState] = mapped_column(SAEnum(JobState), default=JobState.queued)
    total_recordings: Mapped[int] = mapped_column(Integer, default=0)
    processed_recordings: Mapped[int] = mapped_column(Integer, default=0)
    failed_recordings: Mapped[int] = mapped_column(Integer, default=0)
    current_recording_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    current_stage: Mapped[str] = mapped_column(String(100), default="")
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0)
    error_summary: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    project: Mapped["Project"] = relationship(back_populates="jobs")
    config: Mapped["AnalysisConfig"] = relationship(back_populates="jobs")
    recording_analyses: Mapped[list["RecordingAnalysis"]] = relationship(back_populates="job")


class RecordingAnalysis(Base):
    __tablename__ = "recording_analyses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    recording_id: Mapped[str] = mapped_column(String(32), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[str] = mapped_column(String(32), ForeignKey("analysis_jobs.id", ondelete="CASCADE"), nullable=False)
    config_id: Mapped[str] = mapped_column(String(32), ForeignKey("analysis_configs.id"), nullable=False)
    analysis_version: Mapped[str] = mapped_column(String(50), default="1.0.0")
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    input_checksum: Mapped[str] = mapped_column(String(64), default="")
    runtime_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    software_version: Mapped[str] = mapped_column(String(50), default="1.0.0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Technical features (JSON)
    technical_features: Mapped[dict] = mapped_column(JSON, default=dict)
    # Ecoacoustic features (JSON)
    ecoacoustic_features: Mapped[dict] = mapped_column(JSON, default=dict)
    # Comparison results (JSON)
    comparison: Mapped[dict] = mapped_column(JSON, default=dict)
    # Quality info (JSON)
    quality_info: Mapped[dict] = mapped_column(JSON, default=dict)
    # Artifact paths (JSON)
    artifacts: Mapped[dict] = mapped_column(JSON, default=dict)
    # Errors and warnings (JSON list)
    errors_warnings: Mapped[list] = mapped_column(JSON, default=list)

    recording: Mapped["Recording"] = relationship(back_populates="analyses")
    job: Mapped["AnalysisJob"] = relationship(back_populates="recording_analyses")
    quality_flags: Mapped[list["QualityFlag"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    manual_reviews: Mapped[list["ManualReview"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class QualityFlag(Base):
    __tablename__ = "quality_flags"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    analysis_id: Mapped[str] = mapped_column(String(32), ForeignKey("recording_analyses.id", ondelete="CASCADE"), nullable=False)
    flag_code: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[FlagSeverity] = mapped_column(SAEnum(FlagSeverity), default=FlagSeverity.info)
    measured_value: Mapped[str] = mapped_column(String(255), default="")
    threshold: Mapped[str] = mapped_column(String(255), default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    analysis: Mapped["RecordingAnalysis"] = relationship(back_populates="quality_flags")


class ManualReview(Base):
    """Audit trail for manual quality overrides."""
    __tablename__ = "manual_reviews"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    analysis_id: Mapped[str] = mapped_column(String(32), ForeignKey("recording_analyses.id", ondelete="CASCADE"), nullable=False)
    previous_status: Mapped[str] = mapped_column(String(50), default="")
    new_status: Mapped[str] = mapped_column(String(50), default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    reviewer_notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    analysis: Mapped["RecordingAnalysis"] = relationship(back_populates="manual_reviews")


class ProjectSummary(Base):
    """Cached project-level summary results."""
    __tablename__ = "project_summaries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid_str)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    config_id: Mapped[str] = mapped_column(String(32), ForeignKey("analysis_configs.id"), nullable=False)
    recovery_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    healthy_similarity: Mapped[float | None] = mapped_column(Float, nullable=True)
    degraded_similarity: Mapped[float | None] = mapped_column(Float, nullable=True)
    improvement_over_degraded: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_consistency: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_label: Mapped[str] = mapped_column(String(50), default="")
    confidence_reasons: Mapped[list] = mapped_column(JSON, default=list)
    bootstrap_median: Mapped[float | None] = mapped_column(Float, nullable=True)
    bootstrap_mean: Mapped[float | None] = mapped_column(Float, nullable=True)
    bootstrap_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    bootstrap_ci_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    bootstrap_ci_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    bootstrap_iterations: Mapped[int] = mapped_column(Integer, default=0)
    included_recording_ids: Mapped[list] = mapped_column(JSON, default=list)
    excluded_recording_ids: Mapped[list] = mapped_column(JSON, default=list)
    feature_names: Mapped[list] = mapped_column(JSON, default=list)
    scaling_method: Mapped[str] = mapped_column(String(50), default="standard")
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


# Indexes
Index("idx_recordings_project", Recording.project_id)
Index("idx_recordings_checksum", Recording.checksum)
Index("idx_analyses_recording", RecordingAnalysis.recording_id)
Index("idx_jobs_project", AnalysisJob.project_id)
Index("idx_summaries_project", ProjectSummary.project_id)
