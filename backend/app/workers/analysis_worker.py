"""
Background analysis worker.

Polls the database for queued jobs and processes them sequentially.
Progress reflects actual completed processing steps, not a timer.
"""

import asyncio
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session, engine, init_db, Base
from app.models.models import (
    AnalysisJob, Recording, RecordingAnalysis, AnalysisConfig,
    QualityFlag, ManualReview, JobState, QualityStatus, FlagSeverity, ProjectSummary
)
from app.analysis.pipeline import analyze_recording
from app.analysis.quality import evaluate_quality
from app.analysis.reference import (
    compute_reference_model, compute_project_summary, run_bootstrap,
    extract_feature_vector, FEATURE_NAMES
)
from app.analysis.artifacts import generate_spectrogram, generate_waveform_thumbnail
from app.core.config import settings

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def process_job(job_id: str):
    """Process a single analysis job from queue to completion."""
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

        config_dict = {
            "target_sample_rate": config.target_sample_rate,
            "target_channel_mode": config.target_channel_mode,
            "clip_duration": config.clip_duration,
            "start_offset": config.start_offset,
            "freq_min": config.freq_min,
            "freq_max": config.freq_max,
            "fft_size": config.fft_size,
            "window_size": config.window_size,
            "hop_length": config.hop_length,
            "aci_freq_step": config.aci_freq_step,
            "aci_time_step": config.aci_time_step,
            "bi_freq_min": config.bi_freq_min,
            "bi_freq_max": config.bi_freq_max,
            "silence_threshold": config.silence_threshold,
            "clipping_threshold": config.clipping_threshold,
            "low_freq_noise_threshold": config.low_freq_noise_threshold,
            "normalisation_method": config.normalisation_method,
            "similarity_scaling_method": config.similarity_scaling_method,
            "random_seed": config.random_seed,
        }

        # Get recordings
        rec_result = await db.execute(select(Recording).where(Recording.project_id == job.project_id))
        recordings = rec_result.scalars().all()

        job.total_recordings = len(recordings)
        job.state = JobState.preparing
        job.started_at = datetime.now(timezone.utc)
        job.current_stage = "Preparing"
        await db.commit()

        analysis_results: list[tuple[str, dict, dict, dict, dict, list]] = []

        for i, recording in enumerate(recordings):
            if job.state == JobState.cancelled:
                return

            job.current_recording_id = recording.id
            job.current_stage = f"Processing recording {i+1}/{len(recordings)}: {recording.filename}"
            job.progress_percent = (i / max(1, len(recordings))) * 100
            await db.commit()

            if not os.path.exists(recording.storage_path):
                job.failed_recordings += 1
                job.error_summary += f"File not found: {recording.filename}; "
                continue

            # Decoding
            job.state = JobState.decoding
            job.current_stage = f"Decoding: {recording.filename}"
            await db.commit()

            try:
                result = analyze_recording(recording.storage_path, config_dict)
            except Exception as e:
                logger.error("Analysis failed for %s: %s", recording.filename, e)
                job.failed_recordings += 1
                job.error_summary += f"{recording.filename}: {e}; "
                continue

            if result.technical.duration is None:
                job.failed_recordings += 1
                job.error_summary += f"{recording.filename}: decode failure; "
                continue

            # Quality
            job.state = JobState.calculating_quality
            job.current_stage = f"Quality check: {recording.filename}"
            await db.commit()

            tech_dict = {k: v for k, v in result.technical.__dict__.items() if not k.startswith("_")}
            eco_dict = {k: v for k, v in result.ecoacoustic.__dict__.items() if not k.startswith("_")}

            flags_data, suggested_status, status_reason = evaluate_quality(
                tech_dict, config_dict, recording_metadata={
                    "timestamp": recording.timestamp,
                    "site_id": recording.site_id,
                }
            )

            # Features
            job.state = JobState.calculating_features
            job.current_stage = f"Features: {recording.filename}"
            await db.commit()

            # Artifacts
            job.state = JobState.generating_artifacts
            job.current_stage = f"Artifacts: {recording.filename}"
            await db.commit()

            artifacts_dir = settings.projects_storage / job.project_id / "artifacts" / recording.id
            artifacts_dir.mkdir(parents=True, exist_ok=True)

            spec_path = str(artifacts_dir / "spectrogram.png")
            wave_path = str(artifacts_dir / "waveform.png")

            spec_meta = generate_spectrogram(
                recording.storage_path, spec_path,
                fft_size=config.fft_size, hop_length=config.hop_length,
                freq_max=config.freq_max, sample_rate=config.target_sample_rate,
            )
            wave_meta = generate_waveform_thumbnail(recording.storage_path, wave_path)

            artifacts = {
                "spectrogram": spec_path,
                "waveform": wave_path,
                "spectrogram_metadata": spec_meta,
                "waveform_metadata": wave_meta,
            }

            # Save analysis
            job.state = JobState.saving_results
            job.current_stage = f"Saving: {recording.filename}"
            await db.commit()

            analysis = RecordingAnalysis(
                recording_id=recording.id,
                job_id=job.id,
                config_id=config.id,
                analysis_version="1.0.0",
                input_checksum=recording.checksum,
                runtime_seconds=result.runtime_seconds,
                software_version=config.software_version,
                is_active=True,
                technical_features=tech_dict,
                ecoacoustic_features=eco_dict,
                comparison={},
                quality_info={
                    "status": suggested_status.value,
                    "suggested_status": suggested_status.value,
                    "status_reason": status_reason,
                },
                artifacts=artifacts,
                errors_warnings=result.errors,
            )
            db.add(analysis)

            # Add quality flags
            for fd in flags_data:
                flag = QualityFlag(
                    analysis_id=analysis.id,
                    flag_code=fd.flag_code,
                    severity=fd.severity,
                    measured_value=fd.measured_value,
                    threshold=fd.threshold,
                    explanation=fd.explanation,
                    recommended_action=fd.recommended_action,
                )
                db.add(flag)

            await db.flush()
            analysis_results.append((recording.id, eco_dict, tech_dict, {}, {}, result.errors))

            job.processed_recordings += 1
            job.progress_percent = ((i + 1) / max(1, len(recordings))) * 100
            await db.commit()

        # Compute reference model and summary
        if analysis_results:
            healthy_features = []
            degraded_features = []
            restored_features = []
            restored_ids = []

            for rec_id, eco, tech, comp, qi, errs in analysis_results:
                rec_result = await db.execute(select(Recording).where(Recording.id == rec_id))
                rec = rec_result.scalar_one_or_none()
                if not rec:
                    continue
                if rec.habitat_category.value == "healthy":
                    healthy_features.append(eco)
                elif rec.habitat_category.value == "degraded":
                    degraded_features.append(eco)
                elif rec.habitat_category.value == "restored":
                    restored_features.append(eco)
                    restored_ids.append(rec_id)

            if healthy_features and degraded_features and restored_features:
                model = compute_reference_model(
                    healthy_features, degraded_features, restored_features, restored_ids,
                    scaling_method=config.similarity_scaling_method,
                )

                # Update comparison results
                for rec_id, pos, h_sim, d_sim in zip(
                    restored_ids, model.recovery_positions,
                    model.healthy_similarity, model.degraded_similarity
                ):
                    analysis_result = await db.execute(
                        select(RecordingAnalysis).where(
                            RecordingAnalysis.recording_id == rec_id,
                            RecordingAnalysis.job_id == job.id
                        )
                    )
                    a = analysis_result.scalar_one_or_none()
                    if a:
                        a.comparison = {
                            "healthy_reference_similarity": h_sim,
                            "degraded_reference_similarity": d_sim,
                            "recovery_position": pos,
                            "recovery_score": pos * 100,
                        }

                # Bootstrap
                bs_scores, bs_failed = run_bootstrap(
                    healthy_features, degraded_features, restored_features, restored_ids,
                    n_iterations=100, random_seed=config.random_seed,
                    scaling_method=config.similarity_scaling_method,
                )

                summary = compute_project_summary(
                    model_result=model,
                    healthy_count=len(healthy_features),
                    degraded_count=len(degraded_features),
                    restored_count=len(restored_features),
                    total_recordings=job.total_recordings,
                    excluded_count=job.failed_recordings,
                    bootstrap_iterations=100,
                    bootstrap_data=(bs_scores, bs_failed) if bs_scores else None,
                )

                # Save summary
                db_summary = ProjectSummary(
                    project_id=job.project_id,
                    config_id=config.id,
                    recovery_score=summary.recovery_score,
                    healthy_similarity=summary.healthy_similarity,
                    degraded_similarity=summary.degraded_similarity,
                    improvement_over_degraded=summary.improvement_over_degraded,
                    evidence_consistency=summary.evidence_consistency,
                    confidence_label=summary.confidence_label,
                    confidence_reasons=summary.confidence_reasons,
                    bootstrap_median=summary.bootstrap_median,
                    bootstrap_mean=summary.bootstrap_mean,
                    bootstrap_std=summary.bootstrap_std,
                    bootstrap_ci_low=summary.bootstrap_ci_low,
                    bootstrap_ci_high=summary.bootstrap_ci_high,
                    bootstrap_iterations=summary.bootstrap_iterations,
                    included_recording_ids=restored_ids,
                    excluded_recording_ids=[],
                    feature_names=model.feature_names,
                    scaling_method=model.scaling_method,
                    warnings=summary.warnings,
                )
                db.add(db_summary)

        # Final state
        if job.failed_recordings > 0 and job.processed_recordings > 0:
            job.state = JobState.completed_with_warnings
        elif job.failed_recordings > 0 and job.processed_recordings == 0:
            job.state = JobState.failed
        else:
            job.state = JobState.completed

        job.progress_percent = 100.0
        job.completed_at = datetime.now(timezone.utc)
        job.current_stage = job.state.value
        await db.commit()
        logger.info("Job %s completed with state %s", job_id, job.state.value)


async def worker_loop():
    """Main worker loop that polls for queued jobs."""
    logger.info("Starting analysis worker...")
    await init_db()

    while True:
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(AnalysisJob).where(AnalysisJob.state == JobState.queued).order_by(AnalysisJob.created_at).limit(1)
                )
                job = result.scalar_one_or_none()

            if job:
                logger.info("Picked up job %s for project %s", job.id, job.project_id)
                await process_job(job.id)
            else:
                await asyncio.sleep(settings.worker_poll_interval)
        except Exception as e:
            logger.error("Worker error: %s", e)
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(worker_loop())
