"""
Background analysis worker.

Polls the database for queued jobs and processes them using the real pipeline.
Progress reflects actual completed processing steps, not a timer.
"""

import asyncio
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session, init_db
from app.models.models import (
    AnalysisJob, Recording, AnalysisConfig,
    JobState, RecordingAnalysis, QualityFlag, ProjectSummary, ManualReview,
)
from app.analysis.config import AnalysisConfig
from app.analysis.pipeline import run_project_analysis
from app.core.config import settings

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def process_job(job_id: str):
    """Process a single analysis job using the real pipeline."""
    async with async_session() as db:
        result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job or job.state != JobState.queued:
            return

        # Get config
        config_result = await db.execute(select(AnalysisConfig).where(AnalysisConfig.id == job.config_id))
        config = config_result.scalar_one_or_none()
        if not config:
            job.state = JobState.failed
            job.error_summary = "Configuration not found"
            await db.commit()
            return

        # Build AnalysisConfig from DB config
        analysis_config = AnalysisConfig(
            target_sample_rate=config.target_sample_rate,
            channel_mode=config.target_channel_mode,
            segment_duration_seconds=config.clip_duration if config.clip_duration > 0 else 30.0,
            minimum_valid_duration_seconds=5.0,
            frequency_min_hz=config.freq_min,
            frequency_max_hz=config.freq_max,
            n_fft=config.fft_size,
            hop_length=config.hop_length,
            window="hann",
            amplitude_normalization=config.normalisation_method,
            remove_dc_offset=True,
            silence_rms_threshold_dbfs=-50.0,
            clipping_amplitude_threshold=config.clipping_threshold,
            clipping_proportion_warning=0.001,
            silence_proportion_warning=0.50,
            low_frequency_cutoff_hz=300.0,
            low_frequency_noise_warning=config.low_freq_noise_threshold,
            aci_frequency_step_hz=config.aci_freq_step,
            aci_time_step_seconds=config.aci_time_step,
            bi_min_hz=config.bi_freq_min,
            bi_max_hz=config.bi_freq_max,
            biophony_min_hz=config.bi_freq_min,
            biophony_max_hz=config.bi_freq_max,
            anthrophony_min_hz=100.0,
            anthrophony_max_hz=1000.0,
            reference_scaling=config.similarity_scaling_method,
            distance_metric="euclidean",
            minimum_recordings_per_reference_group=3,
            bootstrap_iterations=min(config.random_seed and 100 or 100, 100),
            random_seed=config.random_seed,
            software_version=config.software_version,
        )

        # Get recordings
        rec_result = await db.execute(
            select(Recording).where(Recording.project_id == job.project_id)
        )
        recordings_db = rec_result.scalars().all()

        job.total_recordings = len(recordings_db)
        job.state = JobState.preparing
        job.started_at = datetime.now(timezone.utc)
        job.current_stage = "Preparing"
        await db.commit()

        # Build recording metadata for pipeline
        recordings_meta = []
        for rec in recordings_db:
            if not os.path.exists(rec.storage_path):
                logger.warning("File not found: %s", rec.storage_path)
                continue
            recordings_meta.append({
                "recording_id": rec.id,
                "file_path": rec.storage_path,
                "filename": rec.filename,
                "habitat_category": rec.habitat_category.value,
                "site_id": rec.site_id,
                "timestamp": rec.timestamp,
                "monitoring_period": rec.monitoring_period,
                "recorder_id": rec.recorder_id,
                "notes": rec.notes,
            })

        if not recordings_meta:
            job.state = JobState.failed
            job.error_summary = "No recordings with accessible files found."
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return

        # Output directory
        output_dir = str(settings.projects_storage / job.project_id / "outputs" / job.id)

        # Progress callback
        async def update_progress(stage: str, pct: float, current: str | None):
            job.current_stage = stage
            job.progress_percent = pct
            job.current_recording_id = current
            await db.commit()

        def sync_progress(stage: str, pct: float, current: str | None):
            # The pipeline is synchronous, so we update the DB directly
            job.current_stage = stage
            job.progress_percent = pct
            if current:
                job.current_recording_id = current

        # Run the real pipeline (synchronous — runs in thread pool)
        loop = asyncio.get_event_loop()

        def run_pipeline():
            return run_project_analysis(
                project_id=job.project_id,
                recordings=recordings_meta,
                configuration=analysis_config,
                output_directory=output_dir,
                analysis_job_id=job.id,
                progress_callback=sync_progress,
            )

        try:
            result = await loop.run_in_executor(None, run_pipeline)

            # Save results to database
            job.processed_recordings = result.processed_recordings
            job.failed_recordings = result.failed_recordings
            job.progress_percent = 100.0

            # Save recording analyses
            for rec_result in result.recording_results:
                analysis = RecordingAnalysis(
                    recording_id=rec_result.recording_id,
                    job_id=job.id,
                    config_id=config.id,
                    analysis_version="1.0.0",
                    input_checksum=rec_result.input_checksum,
                    runtime_seconds=rec_result.runtime_seconds,
                    software_version=config.software_version,
                    is_active=True,
                    technical_features=rec_result.technical.model_dump(),
                    ecoacoustic_features={k: v for k, v in rec_result.ecoacoustic.model_dump().items() if k != "aci_by_band"},
                    comparison={},
                    quality_info={"status": rec_result.quality_status},
                    artifacts=rec_result.artifacts,
                    errors_warnings=rec_result.errors + rec_result.warnings,
                )
                db.add(analysis)

                # Save quality flags
                await db.flush()
                for flag in rec_result.quality_flags:
                    db.add(QualityFlag(
                        analysis_id=analysis.id,
                        flag_code=flag.code,
                        severity=flag.severity,
                        measured_value=str(flag.measured_value) if flag.measured_value is not None else "",
                        threshold=str(flag.threshold) if flag.threshold is not None else "",
                        explanation=flag.message,
                        recommended_action=flag.recommended_action,
                    ))

            # Save recovery scores as comparison data
            for rs in result.recovery_scores:
                analysis_result = await db.execute(
                    select(RecordingAnalysis).where(
                        RecordingAnalysis.recording_id == rs.recording_id,
                        RecordingAnalysis.job_id == job.id
                    )
                )
                a = analysis_result.scalar_one_or_none()
                if a:
                    a.comparison = {
                        "healthy_reference_similarity": rs.recovery_score,
                        "degraded_reference_similarity": 100 - (rs.recovery_score or 0),
                        "recovery_position": rs.recovery_position,
                        "recovery_score": rs.recovery_score,
                        "projection_score": rs.projection_score,
                        "feature_agreement": rs.feature_agreement,
                    }

            # Save project summary
            if result.project_recovery_score is not None:
                db_summary = ProjectSummary(
                    project_id=job.project_id,
                    config_id=config.id,
                    recovery_score=result.project_recovery_score,
                    healthy_similarity=result.confidence.components.get("feature_agreement"),
                    degraded_similarity=None,
                    improvement_over_degraded=None,
                    evidence_consistency=result.confidence.evidence_consistency,
                    confidence_label=result.confidence.confidence_label,
                    confidence_reasons=result.confidence.confidence_reasons,
                    bootstrap_median=result.bootstrap.median if result.bootstrap else None,
                    bootstrap_mean=result.bootstrap.mean if result.bootstrap else None,
                    bootstrap_std=result.bootstrap.std if result.bootstrap else None,
                    bootstrap_ci_low=result.bootstrap.ci_2_5 if result.bootstrap else None,
                    bootstrap_ci_high=result.bootstrap.ci_97_5 if result.bootstrap else None,
                    bootstrap_iterations=result.bootstrap.successful_iterations if result.bootstrap else 0,
                    included_recording_ids=result.included_recording_ids,
                    excluded_recording_ids=result.excluded_recording_ids,
                    feature_names=result.feature_names,
                    scaling_method=config.similarity_scaling_method,
                    warnings=result.warnings,
                )
                db.add(db_summary)

            # Set final state
            if result.failed_recordings > 0 and result.processed_recordings > 0:
                job.state = JobState.completed_with_warnings
            elif result.failed_recordings > 0 and result.processed_recordings == 0:
                job.state = JobState.failed
            else:
                job.state = JobState.completed

            job.completed_at = datetime.now(timezone.utc)
            job.current_stage = job.state.value
            await db.commit()
            logger.info("Job %s completed with state %s", job_id, job.state.value)

        except Exception as e:
            logger.error("Pipeline execution failed for job %s: %s", job_id, e, exc_info=True)
            job.state = JobState.failed
            job.error_summary = str(e)[:500]
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()


async def worker_loop():
    """Main worker loop that polls for queued jobs."""
    logger.info("Starting analysis worker...")
    await init_db()

    while True:
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(AnalysisJob).where(AnalysisJob.state == JobState.queued)
                    .order_by(AnalysisJob.created_at).limit(1)
                )
                job = result.scalar_one_or_none()

            if job:
                logger.info("Picked up job %s for project %s", job.id, job.project_id)
                await process_job(job.id)
            else:
                await asyncio.sleep(settings.worker_poll_interval)
        except Exception as e:
            logger.error("Worker error: %s", e, exc_info=True)
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(worker_loop())
