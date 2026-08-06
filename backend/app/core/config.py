"""Core configuration for the AcoustiMap Restore backend."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite+aiosqlite:///./storage/acoustimap.db"

    # Storage
    storage_dir: Path = Path("./storage")

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"]

    # Worker
    worker_poll_interval: float = 1.0
    worker_max_concurrency: int = 1

    # Analysis defaults
    default_sample_rate: int = 22050
    default_fft_size: int = 2048
    default_clip_duration: float = 60.0

    @property
    def projects_storage(self) -> Path:
        return self.storage_dir / "projects"

    class Config:
        env_file = ".env"
        env_prefix = "ACOUSTIMAP_"


settings = Settings()

# Ensure storage directories exist
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.projects_storage.mkdir(parents=True, exist_ok=True)
