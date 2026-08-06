"""Export API endpoints."""

import json
import csv
import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.models import Project, Site, Recording, AnalysisConfig, RecordingAnalysis, QualityFlag, ManualReview, ProjectSummary
from app.core.config import settings

router = APIRouter(tags=["exports"])


@router.get("/api/projects/{project_id}/exports/json")
async def export_project_json(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await _get_project(project_id, db)
    sites = await _get_sites(project_id, db)
    recordings = await _get_recordings(project_id, db)
    configs = await _get_configs(project_id, db)
    analyses = await _get_analyses(project_id, db)
    summary = await _get_summary(project_id, db)

    data = {
        "schemaVersion": "1.0",
        "exportedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "ecosystemType": project.ecosystem_type,
            "country": project.country,
            "region": project.region,
            "latitude": project.latitude,
            "longitude": project.longitude,
            "status": project.status.value,
            "isDemo": project.is_demo,
        },
        "sites": [{"id": s.id, "name": s.name, "type": s.site_type.value, "latitude": s.latitude, "longitude": s.longitude} for s in sites],
        "recordings": [{"id": r.id, "filename": r.filename, "habitat": r.habitat_category.value, "siteId": r.site_id, "timestamp": r.timestamp, "checksum": r.checksum, "fileSize": r.file_size} for r in recordings],
        "configurations": [{"id": c.id, "name": c.name, "isDefault": c.is_default} for c in configs],
        "analyses": [{"id": a.id, "recordingId": a.recording_id, "technicalFeatures": a.technical_features, "ecoacousticFeatures": a.ecoacoustic_features, "comparison": a.comparison, "qualityInfo": a.quality_info} for a in analyses],
        "summary": {"recoveryScore": summary.recovery_score, "confidenceLabel": summary.confidence_label} if summary else None,
    }

    content = json.dumps(data, indent=2, default=str).encode("utf-8")
    return Response(content=content, media_type="application/json",
                    headers={"Content-Disposition": f"attachment; filename=project_{project_id}.json"})


@router.get("/api/projects/{project_id}/exports/csv")
async def export_recordings_csv(project_id: str, db: AsyncSession = Depends(get_db)):
    recordings = await _get_recordings(project_id, db)
    analyses_map = {}
    for r in recordings:
        result = await db.execute(select(RecordingAnalysis).where(RecordingAnalysis.recording_id == r.id, RecordingAnalysis.is_active == True))
        analyses_map[r.id] = result.scalar_one_or_none()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Recording ID", "Filename", "Habitat", "Site", "Timestamp", "Duration", "Quality", "RMS", "Peak", "ACI", "BI", "Similarity", "Metric Source"])

    for r in recordings:
        a = analyses_map.get(r.id)
        tech = a.technical_features if a else {}
        eco = a.ecoacoustic_features if a else {}
        comp = a.comparison if a else {}
        writer.writerow([
            r.id, r.filename, r.habitat_category.value, r.site_id or "", r.timestamp or "",
            tech.get("duration", ""), tech.get("rms_amplitude", ""), tech.get("peak_amplitude", ""),
            eco.get("aci", ""), eco.get("bi", ""),
            comp.get("healthy_reference_similarity", ""),
            "python" if a else "none",
        ])

    content = output.getvalue().encode("utf-8")
    return Response(content=content, media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=recordings_{project_id}.csv"})


@router.get("/api/projects/{project_id}/exports/reproducible-bundle")
async def export_reproducible_bundle(project_id: str, include_audio: bool = False, db: AsyncSession = Depends(get_db)):
    project = await _get_project(project_id, db)
    sites = await _get_sites(project_id, db)
    recordings = await _get_recordings(project_id, db)
    configs = await _get_configs(project_id, db)
    summary = await _get_summary(project_id, db)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # project.json
        zf.writestr("acoustimap-export/project.json", json.dumps({
            "id": project.id, "name": project.name, "description": project.description,
            "ecosystemType": project.ecosystem_type, "country": project.country, "region": project.region,
        }, indent=2))

        # sites.csv
        sites_io = io.StringIO()
        sw = csv.writer(sites_io)
        sw.writerow(["ID", "Name", "Type", "Latitude", "Longitude", "Active"])
        for s in sites:
            sw.writerow([s.id, s.name, s.site_type.value, s.latitude, s.longitude, s.is_active])
        zf.writestr("acoustimap-export/sites.csv", sites_io.getvalue())

        # recordings.csv
        recs_io = io.StringIO()
        rw = csv.writer(recs_io)
        rw.writerow(["ID", "Filename", "Habitat", "Site", "Timestamp", "FileSize", "Checksum"])
        for r in recordings:
            rw.writerow([r.id, r.filename, r.habitat_category.value, r.site_id, r.timestamp, r.file_size, r.checksum])
        zf.writestr("acoustimap-export/recordings.csv", recs_io.getvalue())

        # analysis-config.json
        if configs:
            c = configs[0]
            zf.writestr("acoustimap-export/analysis-config.json", json.dumps({
                "name": c.name, "targetSampleRate": c.target_sample_rate, "fftSize": c.fft_size,
                "hopLength": c.hop_length, "normalisationMethod": c.normalisation_method,
            }, indent=2))

        # README.txt
        readme = """AcoustiMap Restore — Reproducible Analysis Bundle
=================================================

This bundle contains analysis results for: {name}

Contents:
  project.json          - Project metadata
  sites.csv             - Monitoring sites
  recordings.csv        - Recording metadata
  analysis-config.json  - Analysis configuration
  README.txt            - This file

Generated by AcoustiMap Restore v1.0.0
Date: {date}

IMPORTANT: Acoustic indices are not direct measures of species richness
or total biodiversity. Results require ecological context and external
validation. See docs/methodology.md for calculation details.
""".format(name=project.name, date=__import__("datetime").datetime.now().isoformat())
        zf.writestr("acoustimap-export/README.txt", readme)

        # Optionally include audio
        if include_audio:
            for r in recordings:
                import os
                if os.path.exists(r.storage_path):
                    zf.write(r.storage_path, f"acoustimap-export/audio/{r.filename}")

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=acoustimap_export_{project_id}.zip"},
    )


async def _get_project(project_id: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _get_sites(project_id: str, db: AsyncSession) -> list[Site]:
    result = await db.execute(select(Site).where(Site.project_id == project_id))
    return result.scalars().all()


async def _get_recordings(project_id: str, db: AsyncSession) -> list[Recording]:
    result = await db.execute(select(Recording).where(Recording.project_id == project_id))
    return result.scalars().all()


async def _get_configs(project_id: str, db: AsyncSession) -> list[AnalysisConfig]:
    result = await db.execute(select(AnalysisConfig).where(AnalysisConfig.project_id == project_id))
    return result.scalars().all()


async def _get_analyses(project_id: str, db: AsyncSession) -> list[RecordingAnalysis]:
    result = await db.execute(
        select(RecordingAnalysis)
        .join(Recording, RecordingAnalysis.recording_id == Recording.id)
        .where(Recording.project_id == project_id)
    )
    return result.scalars().all()


async def _get_summary(project_id: str, db: AsyncSession) -> ProjectSummary | None:
    result = await db.execute(
        select(ProjectSummary).where(ProjectSummary.project_id == project_id).order_by(ProjectSummary.calculated_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()
