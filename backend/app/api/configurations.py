"""Analysis configuration API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.models import AnalysisConfig
from app.schemas.schemas import (
    AnalysisConfigCreate, AnalysisConfigUpdate,
    AnalysisConfigResponse, AnalysisConfigWithWarnings, ConfigValidationWarning,
)

router = APIRouter(tags=["configurations"])


def validate_config(config: AnalysisConfigCreate) -> list[ConfigValidationWarning]:
    """Validate a configuration and return warnings."""
    warnings: list[ConfigValidationWarning] = []

    nyquist = config.target_sample_rate / 2
    if config.freq_max > nyquist:
        warnings.append(ConfigValidationWarning(
            code="freq_above_nyquist",
            message=f"Maximum frequency ({config.freq_max} Hz) exceeds the Nyquist frequency ({nyquist} Hz) for sample rate {config.target_sample_rate} Hz.",
        ))

    if config.freq_min < 0 or config.freq_max < 0:
        warnings.append(ConfigValidationWarning(
            code="negative_frequency",
            message="Frequency values must be non-negative.",
        ))

    if config.freq_min >= config.freq_max:
        warnings.append(ConfigValidationWarning(
            code="empty_frequency_range",
            message=f"Frequency range [{config.freq_min}, {config.freq_max}] is empty or invalid.",
        ))

    if config.window_size > config.target_sample_rate * 600:  # 10 min max
        warnings.append(ConfigValidationWarning(
            code="window_too_large",
            message="Window size is larger than a typical recording length.",
        ))

    if config.target_sample_rate not in [8000, 16000, 22050, 32000, 44100, 48000]:
        warnings.append(ConfigValidationWarning(
            code="unusual_sample_rate",
            message=f"Sample rate {config.target_sample_rate} is unusual. Common: 22050, 44100, 48000 Hz.",
        ))

    return warnings


@router.get("/api/projects/{project_id}/configurations", response_model=list[AnalysisConfigResponse])
async def list_configurations(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisConfig).where(AnalysisConfig.project_id == project_id).order_by(AnalysisConfig.created_at.desc())
    )
    return result.scalars().all()


@router.post("/api/projects/{project_id}/configurations", response_model=AnalysisConfigWithWarnings, status_code=201)
async def create_configuration(project_id: str, config: AnalysisConfigCreate, db: AsyncSession = Depends(get_db)):
    warnings = validate_config(config)

    # If setting as default, unset other defaults
    if config.is_default:
        existing = await db.execute(
            select(AnalysisConfig).where(AnalysisConfig.project_id == project_id, AnalysisConfig.is_default == True)
        )
        for c in existing.scalars().all():
            c.is_default = False

    db_config = AnalysisConfig(**config.model_dump(), project_id=project_id)
    db.add(db_config)
    await db.commit()
    await db.refresh(db_config)

    response = AnalysisConfigWithWarnings.model_validate(db_config)
    response.warnings = warnings
    return response


@router.patch("/api/configurations/{configuration_id}", response_model=AnalysisConfigWithWarnings)
async def update_configuration(configuration_id: str, updates: AnalysisConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisConfig).where(AnalysisConfig.id == configuration_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(config, key, value)

    # Re-validate
    from app.schemas.schemas import AnalysisConfigCreate
    config_data = AnalysisConfigCreate.model_validate(config, from_attributes=True)
    warnings = validate_config(config_data)

    await db.commit()
    await db.refresh(config)

    response = AnalysisConfigWithWarnings.model_validate(config)
    response.warnings = warnings
    return response
