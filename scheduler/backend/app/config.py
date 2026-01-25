"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables and .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://scheduler:password@localhost:5432/scheduler_dev"

    # AI Service Configuration (Azure OpenAI with Anthropic models)
    # Azure endpoint URL (replace with your Azure endpoint)
    azure_ai_endpoint: str = "https://tankomchattbot.services.ai.azure.com/anthropic/v1/messages"
    # Azure API key
    azure_api_key: str = ""
    # Model deployment name
    anthropic_model: str = "claude-sonnet-4-5-20250929"

    # Legacy: Keep for backward compatibility
    anthropic_api_key: str = ""  # Not used when using Azure

    # Application
    debug: bool = True
    secret_key: str = "dev-secret-key-change-in-production"
    allowed_origins: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000"

    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse allowed_origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    # Scheduler Settings
    max_solve_time_seconds: int = 60
    default_week_start_monday: bool = True

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
