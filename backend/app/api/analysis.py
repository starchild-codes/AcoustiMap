"""Analysis job API endpoints."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.models import AnalysisJob, Recording, RecordingAnalysis, AnalysisConfig, JobState
from app.schemas.schemas import AnalysisJobCreate, AnalysisJobResponse, RecordingAnalysisResponse, ManualReviewCreate, ManualReviewResponse, ProjectSummaryResponse

router = APIRouter(tags=["analysis"])


@router.post("/api/projects/{project_id}/analysis-jobs", response_model=AnalysisJobResponse, status_code=201)
async def create_analysis_job(project_id: str, job: AnalysisJobCreate, db: AsyncSession = Depends(get_db)):
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
    else:
        # All recordings in project
        rec_result = await db.execute(
            select(Recording).where(Recording.project_id == project_id)
        )
        recordings = rec_result.scalars().all()

    job_id = uuid.uuid4().hex
    db_job = AnalysisJob(
        id=job_id,
        project_id=project_id,
        config_id=job.config_id,
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
    if job.state in [JobState.completed, JobState.failed, JobState.cancelled]:
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
    job.failed_recordings = 0
    job.error_summary = ""
    job.started_at = None
    job.completed_at = None
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/api/recordings/{recording_id}/analyses", response_model=list[RecordingAnalysisResponse])
async def list_recording_analyses(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RecordingAnalysis).where(RecordingAnalysis.recording_id == recording_id).order_by(RecordingAnalysis.processed_at.desc())
    )
    return result.scalars().all()


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
