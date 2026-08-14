"""Analysis job API endpoints."""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.session import get_db
from app.core.config import settings
from app.models.models import AnalysisJob, Recording, RecordingAnalysis, AnalysisConfig, JobState, Project
from app.schemas.schemas import AnalysisJobCreate, AnalysisJobResponse, RecordingAnalysisResponse, ManualReviewCreate, ManualReviewResponse, ProjectSummaryResponse

router = APIRouter(tags=["analysis"])


@router.post("/api/projects/{project_id}/analysis-jobs", response_model=AnalysisJobResponse, status_code=201)
async def create_analysis_job(project_id: str, job: AnalysisJobCreate, db: AsyncSession = Depends(get_db)):
    project_result = await db.execute(select(Project.id).where(Project.id == project_id))
    if project_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate config belongs to project
    config_result = await db.execute(
        select(AnalysisConfig).where(AnalysisConfig.id == job.config_id, AnalysisConfig.project_id == project_id)
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found in this project")

    # Determine recordings to analyse
    if job.recording_ids:
        rec_result = await db.execute(
            select(Recording).where(Recording.project_id == project_id, Recording.id.in_(job.recording_ids))
        )
        recordings = rec_result.scalars().all()
        found_ids = {recording.id for recording in recordings}
        missing_ids = sorted(set(job.recording_ids) - found_ids)
        if missing_ids:
            raise HTTPException(status_code=422, detail={
                "message": "One or more requested recordings do not belong to this project.",
                "recording_ids": missing_ids,
            })
    else:
        # All recordings in project
        rec_result = await db.execute(
            select(Recording).where(Recording.project_id == project_id)
        )
        recordings = rec_result.scalars().all()

    if not recordings:
        raise HTTPException(status_code=422, detail="No recordings were selected for analysis")

    role_counts = {"healthy": 0, "degraded": 0, "restored": 0}
    for recording in recordings:
        role_counts[recording.habitat_category.value] += 1
    if role_counts["healthy"] < 3 or role_counts["degraded"] < 3 or role_counts["restored"] < 1:
        raise HTTPException(status_code=422, detail={
            "message": "Analysis requires at least 3 healthy-reference, 3 degraded-reference, and 1 restoration recording.",
            "role_counts": role_counts,
        })

    job_id = uuid.uuid4().hex
    db_job = AnalysisJob(
        id=job_id,
        project_id=project_id,
        config_id=job.config_id,
        recording_ids=[recording.id for recording in recordings],
        state=JobState.queued,
        total_recordings=len(recordings),
        processed_recordings=0,
        failed_recordings=0,
        current_stage="Queued",
    )
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)
    return db_job


@router.get("/api/projects/{project_id}/analysis-jobs", response_model=list[AnalysisJobResponse])
async def list_analysis_jobs(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisJob)
        .where(AnalysisJob.project_id == project_id)
        .order_by(AnalysisJob.created_at.desc())
    )
    return result.scalars().all()


@router.get("/api/analysis-jobs/{job_id}", response_model=AnalysisJobResponse)
async def get_analysis_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/api/analysis-jobs/{job_id}/cancel", response_model=AnalysisJobResponse)
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.state in [JobState.completed, JobState.completed_with_warnings, JobState.failed, JobState.cancelled]:
        raise HTTPException(status_code=400, detail=f"Job is already in state {job.state.value}")
    job.state = JobState.cancelled
    job.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)
    return job


@router.post("/api/analysis-jobs/{job_id}/retry", response_model=AnalysisJobResponse)
async def retry_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.state != JobState.failed:
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")
    job.state = JobState.queued
    job.processed_recordings = 0
    job.failed_recordings = 0
    job.current_recording_id = None
    job.current_stage = "Queued for retry"
    job.progress_percent = 0.0
    job.error_summary = ""
    job.started_at = None
    job.completed_at = None
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/api/recordings/{recording_id}/analyses", response_model=list[RecordingAnalysisResponse])
async def list_recording_analyses(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RecordingAnalysis)
        .options(selectinload(RecordingAnalysis.quality_flags), selectinload(RecordingAnalysis.manual_reviews))
        .where(RecordingAnalysis.recording_id == recording_id)
        .order_by(RecordingAnalysis.processed_at.desc())
    )
    return result.scalars().all()


@router.get("/api/analysis-jobs/{job_id}/results", response_model=list[RecordingAnalysisResponse])
async def list_job_results(job_id: str, db: AsyncSession = Depends(get_db)):
    job_result = await db.execute(select(AnalysisJob.id).where(AnalysisJob.id == job_id))
    if job_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Job not found")
    result = await db.execute(
        select(RecordingAnalysis)
        .options(selectinload(RecordingAnalysis.quality_flags), selectinload(RecordingAnalysis.manual_reviews))
        .where(RecordingAnalysis.job_id == job_id)
        .order_by(RecordingAnalysis.processed_at, RecordingAnalysis.recording_id)
    )
    return result.scalars().all()


@router.get("/api/analyses/{analysis_id}/artifacts/{artifact_name}")
async def get_analysis_artifact(analysis_id: str, artifact_name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RecordingAnalysis).where(RecordingAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    raw_path = analysis.artifacts.get(artifact_name)
    if isinstance(raw_path, dict):
        raw_path = raw_path.get("path")
    if not isinstance(raw_path, str):
        raise HTTPException(status_code=404, detail="Artifact not found")
    path = Path(raw_path).resolve()
    storage_root = settings.projects_storage.resolve()
    if storage_root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact is unavailable")
    media_type = "image/png" if path.suffix.lower() == ".png" else "application/octet-stream"
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.get("/api/projects/{project_id}/summary", response_model=ProjectSummaryResponse | None)
async def get_project_summary(project_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import ProjectSummary
    result = await db.execute(
        select(ProjectSummary).where(ProjectSummary.project_id == project_id).order_by(ProjectSummary.calculated_at.desc()).limit(1)
    )
    summary = result.scalar_one_or_none()
    return summary


@router.post("/api/analyses/{analysis_id}/manual-review", response_model=ManualReviewResponse, status_code=201)
async def create_manual_review(analysis_id: str, review: ManualReviewCreate, db: AsyncSession = Depends(get_db)):
    from app.models.models import ManualReview, RecordingAnalysis
    result = await db.execute(select(RecordingAnalysis).where(RecordingAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    previous = analysis.quality_info.get("status", "good")
    db_review = ManualReview(
        analysis_id=analysis_id,
        previous_status=previous,
        new_status=review.new_status,
        reason=review.reason,
        reviewer_notes=review.reviewer_notes,
    )
    # Update quality info
    quality_info = dict(analysis.quality_info)
    quality_info["status"] = review.new_status
    analysis.quality_info = quality_info

    db.add(db_review)
    await db.commit()
    await db.refresh(db_review)
    return db_review
