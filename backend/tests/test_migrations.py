"""Regression tests for Alembic adoption and legacy-schema upgrades."""

import asyncio
import os
import sqlite3
import subprocess
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


def _upgrade(database_path: Path) -> None:
    environment = os.environ | {
        "ACOUSTIMAP_DATABASE_URL": f"sqlite+aiosqlite:///{database_path.as_posix()}",
        "ACOUSTIMAP_STORAGE_DIR": str(database_path.parent / "storage"),
    }
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )


def _columns(database_path: Path, table_name: str) -> set[str]:
    with sqlite3.connect(database_path) as connection:
        return {row[1] for row in connection.execute(f"PRAGMA table_info({table_name})")}


def test_fresh_database_is_created_and_versioned(tmp_path: Path):
    database_path = tmp_path / "fresh.db"
    _upgrade(database_path)

    assert "projects" in {row[0] for row in sqlite3.connect(database_path).execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "recording_ids" in _columns(database_path, "analysis_jobs")
    assert "temporal_result" in _columns(database_path, "project_summaries")
    with sqlite3.connect(database_path) as connection:
        assert connection.execute("SELECT version_num FROM alembic_version").fetchone()[0] == "20260823_01"


def test_unversioned_legacy_columns_are_renamed_and_backfilled(tmp_path: Path):
    database_path = tmp_path / "legacy.db"
    with sqlite3.connect(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE projects (id VARCHAR(32) PRIMARY KEY);
            CREATE TABLE analysis_configs (
                id VARCHAR(32) PRIMARY KEY,
                bi_freq_min FLOAT NOT NULL DEFAULT 2000,
                bi_freq_max FLOAT NOT NULL DEFAULT 8000
            );
            CREATE TABLE analysis_jobs (id VARCHAR(32) PRIMARY KEY);
            CREATE TABLE project_summaries (
                id VARCHAR(32) PRIMARY KEY,
                healthy_similarity FLOAT,
                degraded_similarity FLOAT
            );
            """
        )
    _upgrade(database_path)

    assert {"biological_band_min_hz", "biological_band_max_hz", "bootstrap_iterations", "temporal_bootstrap_iterations"} <= _columns(database_path, "analysis_configs")
    assert "recording_ids" in _columns(database_path, "analysis_jobs")
    assert {"median_distance_to_healthy", "median_distance_to_degraded", "bootstrap_requested_iterations", "reference_profiles", "temporal_result"} <= _columns(database_path, "project_summaries")
