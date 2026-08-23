"""Database engine and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    async with async_session() as session:
        yield session


async def init_db():
    """Verify that the schema has been migrated before accepting requests."""
    async with engine.begin() as conn:
        has_projects = await conn.run_sync(lambda sync_conn: sync_conn.dialect.has_table(sync_conn, "projects"))
    if not has_projects:
        raise RuntimeError("Database is not initialized. Run `alembic upgrade head` from backend/ first.")
