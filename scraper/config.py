from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # seconds

    # Cache
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300  # seconds
    CACHE_MAX_SIZE: int = 1000

    # Scraping
    REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 2

    # Browser Settings
    HEADLESS: bool = True
    BROWSER_TIMEOUT: int = 30000  # milliseconds

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()