"""
Background analysis worker.

Polls the database for queued jobs and processes them using the real pipeline.
Progress reflects actual completed processing steps, not a timer.
"""

import asyncio
import os
import time
import threading
import statistics
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session, init_db
from app.models.models import (
    AnalysisJob, Recording, AnalysisConfig as AnalysisConfigModel,
    JobState, RecordingAnalysis, QualityFlag, ProjectSummary, ManualReview,
)
from app.analysis.config import AnalysisConfig as PipelineAnalysisConfig
from app.analysis.pipeline import run_project_analysis
from app.analysis.exceptions import AnalysisCancelledError
from app.core.config import settings

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def build_pipeline_config(config: AnalysisConfigModel) -> PipelineAnalysisConfig:
    """Map the persisted configuration to the exact executable configuration."""
    return PipelineAnalysisConfig(
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
        biological_band_min_hz=config.biological_band_min_hz,
        biological_band_max_hz=config.biological_band_max_hz,
        biophony_min_hz=config.biological_band_min_hz,
        biophony_max_hz=config.biological_band_max_hz,
        anthrophony_min_hz=100.0,
        anthrophony_max_hz=1000.0,
        reference_scaling=config.similarity_scaling_method,
        distance_metric="euclidean",
        minimum_recordings_per_reference_group=3,
        bootstrap_iterations=config.bootstrap_iterations,
        temporal_bootstrap_iterations=config.temporal_bootstrap_iterations,
        temporal_stable_threshold_per_year=config.temporal_stable_threshold_per_year,
        temporal_strong_threshold_per_year=config.temporal_strong_threshold_per_year,
        random_seed=config.random_seed,
        software_version=config.software_version,
    )


async def process_job(job_id: str):
    """Process a single analysis job using the real pipeline."""
    async with async_session() as db:
        result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job or job.state != JobState.queued:
            return

        # Get config
        config_result = await db.execute(select(AnalysisConfigModel).where(AnalysisConfigModel.id == job.config_id))
        config = config_result.scalar_one_or_none()
        if not config:
            job.state = JobState.failed
            job.error_summary = "Configuration not found"
            await db.commit()
            return

        analysis_config = build_pipeline_config(config)

        # Get recordings
        recording_query = select(Recording).where(Recording.project_id == job.project_id)
        if job.recording_ids:
            recording_query = recording_query.where(Recording.id.in_(job.recording_ids))
        rec_result = await db.execute(recording_query)
        recordings_db = rec_result.scalars().all()

        if job.recording_ids:
            found_ids = {recording.id for recording in recordings_db}
            missing_ids = sorted(set(job.recording_ids) - found_ids)
            if missing_ids:
                job.state = JobState.failed
                job.error_summary = f"Requested recordings are unavailable: {', '.join(missing_ids)}"
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return

        job.total_recordings = len(recordings_db)
        job.state = JobState.preparing
        job.started_at = datetime.now(timezone.utc)
        job.current_stage = "Preparing"
        await db.commit()

        # Build recording metadata for pipeline
        recordings_meta = []
        inaccessible = []
        for rec in recordings_db:
            if not os.path.exists(rec.storage_path):
                logger.warning("File not found: %s", rec.storage_path)
                inaccessible.append(f"{rec.id} ({rec.filename})")
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

        if inaccessible:
            job.state = JobState.failed
            job.failed_recordings = len(inaccessible)
            job.error_summary = "Audio files are inaccessible: " + ", ".join(inaccessible)
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return

        if not recordings_meta:
            job.state = JobState.failed
            job.error_summary = "No recordings with accessible files found."
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return

        # Output directory
        output_dir = str(settings.projects_storage / job.project_id / "outputs" / job.id)

        # The pipeline runs in a worker thread. Progress is transferred through
        # an asyncio queue and committed by this event-loop thread.
        progress_queue: asyncio.Queue[tuple[str, float, str | None]] = asyncio.Queue()
        cancellation_event = threading.Event()
        loop = asyncio.get_running_loop()

        def sync_progress(stage: str, pct: float, current: str | None):
            loop.call_soon_threadsafe(progress_queue.put_nowait, (stage, pct, current))

        # Run the real pipeline (synchronous — runs in thread pool)
        def run_pipeline():
            return run_project_analysis(
                project_id=job.project_id,
                recordings=recordings_meta,
                configuration=analysis_config,
                output_directory=output_dir,
                analysis_job_id=job.id,
                progress_callback=sync_progress,
                cancellation_check=cancellation_event.is_set,
            )

        try:
            pipeline_task = asyncio.create_task(asyncio.to_thread(run_pipeline))
            started_recording_ids: set[str] = set()
            while not pipeline_task.done():
                try:
                    stage, pct, current = await asyncio.wait_for(progress_queue.get(), timeout=0.25)
                    job.current_stage = stage
                    job.progress_percent = pct
                    job.current_recording_id = current
                    if current and stage.startswith("Processing recording"):
                        if current not in started_recording_ids:
                            started_recording_ids.add(current)
                            job.processed_recordings = max(job.processed_recordings, len(started_recording_ids) - 1)
                    if pct >= 50:
                        job.processed_recordings = max(job.processed_recordings, len(started_recording_ids))
                    await db.commit()
                except asyncio.TimeoutError:
                    pass

                await db.refresh(job)
                if job.state == JobState.cancelled:
                    cancellation_event.set()

            result = await pipeline_task
            await db.refresh(job)
            if job.state == JobState.cancelled:
                job.completed_at = job.completed_at or datetime.now(timezone.utc)
                job.current_stage = "Cancelled"
                await db.commit()
                return

            # Save results to database
            job.processed_recordings = result.processed_recordings
            job.failed_recordings = result.failed_recordings
            job.progress_percent = 100.0

            # Save recording analyses
            old_analyses_result = await db.execute(
                select(RecordingAnalysis).where(
                    RecordingAnalysis.recording_id.in_([r.recording_id for r in result.recording_results]),
                    RecordingAnalysis.is_active == True,
                )
            )
            for old_analysis in old_analyses_result.scalars().all():
                old_analysis.is_active = False

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
                        "distance_to_healthy": rs.distance_to_healthy,
                        "distance_to_degraded": rs.distance_to_degraded,
                        "recovery_position": rs.recovery_position,
                        "recovery_score": rs.recovery_score,
                        "projection_score": rs.projection_score,
                        "feature_agreement": rs.feature_agreement,
                    }

            # Save a project result envelope even when reference modelling is
            # insufficient, so the UI can explain the missing score.
            healthy_distances = [s.distance_to_healthy for s in result.recovery_scores if s.distance_to_healthy is not None]
            degraded_distances = [s.distance_to_degraded for s in result.recovery_scores if s.distance_to_degraded is not None]
            db_summary = ProjectSummary(
                    project_id=job.project_id,
                    config_id=config.id,
                    recovery_score=result.project_recovery_score,
                    median_distance_to_healthy=statistics.median(healthy_distances) if healthy_distances else None,
                    median_distance_to_degraded=statistics.median(degraded_distances) if degraded_distances else None,
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
                    bootstrap_requested_iterations=result.bootstrap.requested_iterations if result.bootstrap else config.bootstrap_iterations,
                    included_recording_ids=result.included_recording_ids,
                    excluded_recording_ids=result.excluded_recording_ids,
                    feature_names=result.feature_names,
                    scaling_method=config.similarity_scaling_method,
                    warnings=result.warnings,
                    reference_profiles={key: value.model_dump() for key, value in result.reference_profiles.items()},
                    temporal_result=result.temporal or {},
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

        except AnalysisCancelledError:
            await db.refresh(job)
            job.state = JobState.cancelled
            job.current_stage = "Cancelled"
            job.completed_at = job.completed_at or datetime.now(timezone.utc)
            await db.commit()
            logger.info("Job %s cancelled", job_id)
        except Exception as e:
            await db.refresh(job)
            if job.state == JobState.cancelled:
                job.current_stage = "Cancelled"
                job.completed_at = job.completed_at or datetime.now(timezone.utc)
                await db.commit()
                return
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
