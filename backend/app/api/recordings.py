"""Recording API endpoints with file upload."""

import hashlib
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.core.config import settings
from app.models.models import Recording, SiteType
from app.schemas.schemas import RecordingResponse, RecordingUpdate

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
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Unsupported file format: {ext}. Supported: {', '.join(ALLOWED_EXTENSIONS)}")

    recording_id = uuid.uuid4().hex
    storage_path = _get_storage_path(project_id, recording_id, file.filename or "audio")

    # Write file
    file_size = 0
    with open(storage_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            file_size += len(chunk)

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
        habitat_category=SiteType(habitat_category),
        timestamp=timestamp,
        monitoring_period=monitoring_period,
        recorder_id=recorder_id,
        notes=notes,
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


@router.patch("/api/recordings/{recording_id}", response_model=RecordingResponse)
async def update_recording(recording_id: str, updates: RecordingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
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
