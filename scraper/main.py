from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from api.routes import router
from config import settings
from utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting X Engagement Scraper Service")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    yield
    logger.info("Shutting down X Engagement Scraper Service")

app = FastAPI(
    title="X Engagement Scraper API",
    description="API for scraping and validating X (Twitter) engagements",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {
        "service": "X Engagement Scraper API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )