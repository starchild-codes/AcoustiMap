"""Site API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.session import get_db
from app.models.models import Site, Recording, SiteType
from app.schemas.schemas import SiteCreate, SiteUpdate, SiteResponse

router = APIRouter(tags=["sites"])


@router.get("/api/projects/{project_id}/sites", response_model=list[SiteResponse])
async def list_sites(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Site).where(Site.project_id == project_id).order_by(Site.name))
    return result.scalars().all()


@router.post("/api/projects/{project_id}/sites", response_model=SiteResponse, status_code=201)
async def create_site(project_id: str, site: SiteCreate, db: AsyncSession = Depends(get_db)):
    db_site = Site(**site.model_dump(), project_id=project_id)
    db.add(db_site)
    await db.commit()
    await db.refresh(db_site)
    return db_site


@router.patch("/api/sites/{site_id}", response_model=SiteResponse)
async def update_site(site_id: str, updates: SiteUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(site, key, value)
    await db.commit()
    await db.refresh(site)
    return site


@router.delete("/api/sites/{site_id}", status_code=204)
async def delete_site(site_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    await db.delete(site)
    await db.commit()
