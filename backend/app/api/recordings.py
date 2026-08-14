"""Recording API endpoints with file upload."""

import hashlib
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.core.config import settings
from app.models.models import Recording, SiteType, Project, Site
from app.schemas.schemas import RecordingCreate, RecordingResponse, RecordingUpdate

router = APIRouter(tags=["recordings"])

ALLOWED_EXTENSIONS = {".wav", ".flac", ".mp3", ".m4a", ".ogg"}


def _get_storage_path(project_id: str, recording_id: str, filename: str) -> Path:
    project_dir = settings.projects_storage / project_id / "recordings"
    project_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix
    return project_dir / f"{recording_id}{ext}"


def _compute_checksum(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


@router.get("/api/projects/{project_id}/recordings", response_model=list[RecordingResponse])
async def list_recordings(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recording).where(Recording.project_id == project_id).order_by(Recording.uploaded_at.desc())
    )
    return result.scalars().all()


@router.post("/api/projects/{project_id}/recordings", response_model=RecordingResponse, status_code=201)
async def upload_recording(
    project_id: str,
    file: UploadFile = File(...),
    habitat_category: str = Form(...),
    site_id: str | None = Form(None),
    timestamp: str | None = Form(None),
    monitoring_period: str = Form(""),
    recorder_id: str = Form(""),
    notes: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    project_result = await db.execute(select(Project.id).where(Project.id == project_id))
    if project_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        metadata = RecordingCreate(
            filename=file.filename or "audio",
            habitat_category=habitat_category,
            site_id=site_id,
            timestamp=timestamp,
            monitoring_period=monitoring_period,
            recorder_id=recorder_id,
            notes=notes,
        )
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if site_id:
        site_result = await db.execute(
            select(Site).where(Site.id == site_id, Site.project_id == project_id)
        )
        selected_site = site_result.scalar_one_or_none()
        if selected_site is None:
            raise HTTPException(status_code=422, detail="Selected site does not belong to this project")
        if selected_site.site_type != metadata.habitat_category:
            raise HTTPException(status_code=422, detail="Recording role must match the selected site's role")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Unsupported file format: {ext}. Supported: {', '.join(ALLOWED_EXTENSIONS)}")

    recording_id = uuid.uuid4().hex
    storage_path = _get_storage_path(project_id, recording_id, file.filename or "audio")

    # Write file, removing partial uploads on failure.
    file_size = 0
    try:
        with open(storage_path, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
                file_size += len(chunk)
    except Exception:
        storage_path.unlink(missing_ok=True)
        raise
    if file_size == 0:
        storage_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Uploaded audio file is empty")

    checksum = _compute_checksum(str(storage_path))

    # Check for duplicates
    existing = await db.execute(
        select(Recording).where(Recording.project_id == project_id, Recording.checksum == checksum)
    )
    if existing.scalar_one_or_none():
        os.remove(storage_path)
        raise HTTPException(status_code=409, detail="Duplicate file: a recording with the same checksum already exists in this project.")

    db_recording = Recording(
        id=recording_id,
        project_id=project_id,
        site_id=site_id,
        filename=file.filename or "audio",
        storage_path=str(storage_path),
        file_size=file_size,
        mime_type=file.content_type or "",
        checksum=checksum,
        habitat_category=metadata.habitat_category,
        timestamp=metadata.timestamp,
        monitoring_period=metadata.monitoring_period,
        recorder_id=metadata.recorder_id,
        notes=metadata.notes,
    )
    db.add(db_recording)
    await db.commit()
    await db.refresh(db_recording)
    return db_recording


@router.get("/api/recordings/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording


@router.get("/api/recordings/{recording_id}/audio")
async def stream_recording_audio(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    path = Path(recording.storage_path).resolve()
    storage_root = settings.projects_storage.resolve()
    if storage_root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Recording audio is unavailable")
    return FileResponse(path, media_type=recording.mime_type or "application/octet-stream", filename=recording.filename)


@router.patch("/api/recordings/{recording_id}", response_model=RecordingResponse)
async def update_recording(recording_id: str, updates: RecordingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    next_role = updates.habitat_category or recording.habitat_category
    next_site_id = updates.site_id if "site_id" in updates.model_fields_set else recording.site_id
    if next_site_id:
        site_result = await db.execute(
            select(Site).where(Site.id == next_site_id, Site.project_id == recording.project_id)
        )
        selected_site = site_result.scalar_one_or_none()
        if selected_site is None:
            raise HTTPException(status_code=422, detail="Selected site does not belong to this project")
        if selected_site.site_type != next_role:
            raise HTTPException(status_code=422, detail="Recording role must match the selected site's role")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(recording, key, value)
    await db.commit()
    await db.refresh(recording)
    return recording


@router.delete("/api/recordings/{recording_id}", status_code=204)
async def delete_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    # Delete file
    if os.path.exists(recording.storage_path):
        os.remove(recording.storage_path)
    await db.delete(recording)
    await db.commit()
