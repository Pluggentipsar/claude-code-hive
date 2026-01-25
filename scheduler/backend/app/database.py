"""
Database configuration and session management.
"""

from sqlalchemy import create_engine, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects import postgresql
from typing import Generator, Any
import json

from app.config import settings


class JSONType(TypeDecorator):
    """
    JSON type that works with both SQLite (using TEXT) and PostgreSQL (using JSONB).
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(postgresql.JSONB())
        else:
            return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        # Let SQLAlchemy's JSON type handle serialization
        return value

    def process_result_value(self, value, dialect):
        # Let SQLAlchemy's JSON type handle deserialization
        return value

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using
    echo=settings.debug,  # Log SQL queries in debug mode
)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI routes to get database session.

    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database by creating all tables.
    Only use this in development. For production, use Alembic migrations.
    """
    Base.metadata.create_all(bind=engine)
