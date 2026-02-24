"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables and .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (using psycopg3 driver)
    database_url: str = "postgresql+psycopg://scheduler:password@localhost:5432/scheduler_dev"

    # Application
    debug: bool = True
    secret_key: str = "dev-secret-key-change-in-production"
    allowed_origins: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse allowed_origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    # Authentication
    access_token_expire_minutes: int = 480

    # API Settings
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Kålgårdens Schemaläggningssystem"
    version: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
