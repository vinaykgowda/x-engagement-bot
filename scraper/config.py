from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = ["*"]

    # RapidAPI Configuration
    RAPIDAPI_KEY: str = ""
    RAPIDAPI_HOST: str = "twitter-aio.p.rapidapi.com"
    RAPIDAPI_BASE_URL: str = "https://twitter-aio.p.rapidapi.com"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600

    # Cache Configuration
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300
    CACHE_MAX_SIZE: int = 1000

    # Request & Retry Configuration
    REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create global settings instance
settings = Settings()
