"""Bring unversioned AcoustiMap databases under Alembic control.

Revision ID: 20260823_01
Revises:
Create Date: 2026-08-23
"""

from alembic import op
import sqlalchemy as sa

from app.database.session import Base
from app.models import models  # noqa: F401 - populate Base.metadata

revision = "20260823_01"
down_revision = None
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _columns(table_name):
        op.add_column(table_name, column)


def upgrade() -> None:
    """Create a fresh schema or upgrade the prior unversioned prototype schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("projects"):
        Base.metadata.create_all(bind)
        return

    config_columns = _columns("analysis_configs")
    with op.batch_alter_table("analysis_configs") as batch:
        if "bi_freq_min" in config_columns and "biological_band_min_hz" not in config_columns:
            batch.alter_column("bi_freq_min", new_column_name="biological_band_min_hz")
        if "bi_freq_max" in config_columns and "biological_band_max_hz" not in config_columns:
            batch.alter_column("bi_freq_max", new_column_name="biological_band_max_hz")
    _add_column_if_missing("analysis_configs", sa.Column("bootstrap_iterations", sa.Integer(), nullable=False, server_default="500"))
    _add_column_if_missing("analysis_configs", sa.Column("temporal_bootstrap_iterations", sa.Integer(), nullable=False, server_default="500"))
    _add_column_if_missing("analysis_configs", sa.Column("temporal_stable_threshold_per_year", sa.Float(), nullable=False, server_default="1.0"))
    _add_column_if_missing("analysis_configs", sa.Column("temporal_strong_threshold_per_year", sa.Float(), nullable=False, server_default="5.0"))

    _add_column_if_missing("analysis_jobs", sa.Column("recording_ids", sa.JSON(), nullable=False, server_default="[]"))

    summary_columns = _columns("project_summaries")
    with op.batch_alter_table("project_summaries") as batch:
        if "healthy_similarity" in summary_columns and "median_distance_to_healthy" not in summary_columns:
            batch.alter_column("healthy_similarity", new_column_name="median_distance_to_healthy")
        if "degraded_similarity" in summary_columns and "median_distance_to_degraded" not in summary_columns:
            batch.alter_column("degraded_similarity", new_column_name="median_distance_to_degraded")
    _add_column_if_missing("project_summaries", sa.Column("bootstrap_requested_iterations", sa.Integer(), nullable=False, server_default="0"))
    _add_column_if_missing("project_summaries", sa.Column("reference_profiles", sa.JSON(), nullable=False, server_default="{}"))
    _add_column_if_missing("project_summaries", sa.Column("temporal_result", sa.JSON(), nullable=False, server_default="{}"))


def downgrade() -> None:
    raise NotImplementedError("This adoption migration is intentionally irreversible; restore from backup to roll back.")
