"""Seed script that creates a demonstration project with sites and metadata."""

import asyncio
import uuid
from datetime import datetime, timezone

from app.database.session import async_session, init_db
from app.models.models import (
    Project, Site, AnalysisConfig, ProjectStatus, PrivacyLevel, SiteType
)


async def seed():
    """Create demonstration project with sites and configuration."""
    await init_db()

    async with async_session() as db:
        # Check if demo project already exists
        from sqlalchemy import select
        existing = await db.execute(select(Project).where(Project.is_demo == True))
        if existing.scalar_one_or_none():
            print("Demo project already exists. Skipping seed.")
            return

        project_id = uuid.uuid4().hex
        project = Project(
            id=project_id,
            name="Mars Coral Reef Restoration (Demonstration)",
            description="Demonstration project for the AcoustiMap Restore prototype. This data is not validated field results.",
            ecosystem_type="Coral reef",
            country="Indonesia",
            region="South Sulawesi",
            latitude=-5.5,
            longitude=120.3,
            restoration_intervention="Mars Assisted Reef Restoration (MARR) hexadome structures",
            intervention_date="2024-01-15",
            monitoring_start="2026-01-01",
            monitoring_end="2026-06-30",
            status=ProjectStatus.monitoring,
            privacy=PrivacyLevel.public,
            organisation="Mars Sustainable Solutions",
            primary_contact="Demo User",
            scientific_notes="Demonstration data — not validated field results. No audio files are bundled with this prototype.",
            is_demo=True,
        )
        db.add(project)

        # Sites
        healthy_site = Site(
            id=uuid.uuid4().hex,
            project_id=project_id,
            name="Healthy Reference Site A",
            site_type=SiteType.healthy,
            latitude=-5.48,
            longitude=120.28,
            habitat_description="Undisturbed coral reef with high live coral cover",
            recorder_id="hydrophone_healthy_01",
            recorder_model="SoundTrap ST300",
            deployment_date="2026-01-10",
            mic_height_depth=-8.0,
            distance_to_noise=500.0,
            notes="Reference site with minimal anthropogenic disturbance",
        )
        db.add(healthy_site)

        restored_site = Site(
            id=uuid.uuid4().hex,
            project_id=project_id,
            name="Restored Site A",
            site_type=SiteType.restored,
            latitude=-5.50,
            longitude=120.30,
            habitat_description="Restored reef with MARR hexadome structures installed in 2024",
            recorder_id="hydrophone_restored_01",
            recorder_model="SoundTrap ST300",
            deployment_date="2026-01-10",
            mic_height_depth=-8.0,
            distance_to_noise=200.0,
            notes="Restoration site, 2 years post-intervention",
        )
        db.add(restored_site)

        degraded_site = Site(
            id=uuid.uuid4().hex,
            project_id=project_id,
            name="Degraded Comparison Site A",
            site_type=SiteType.degraded,
            latitude=-5.52,
            longitude=120.32,
            habitat_description="Blast-fished reef with low coral cover",
            recorder_id="hydrophone_degraded_01",
            recorder_model="SoundTrap ST300",
            deployment_date="2026-01-10",
            mic_height_depth=-8.0,
            distance_to_noise=100.0,
            notes="Degraded baseline site",
        )
        db.add(degraded_site)

        # Default analysis configuration
        config = AnalysisConfig(
            id=uuid.uuid4().hex,
            project_id=project_id,
            name="Default Configuration",
            is_default=True,
            is_demo=True,
        )
        db.add(config)

        await db.commit()
        print(f"Seed complete. Demo project created: {project_id}")
        print("NOTE: No audio files are bundled. Upload recordings to run analysis.")


if __name__ == "__main__":
    asyncio.run(seed())
