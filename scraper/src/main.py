from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from .api.routes import router
from .api.models import VerifyEngagementRequest, VerifyEngagementResponse
from .scrapers.engagement_checker import engagement_checker
from .config import settings
from .utils.logger import logger

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

@app.post("/api/verify-engagement", response_model=VerifyEngagementResponse)
async def verify_engagement(request: VerifyEngagementRequest):
    """Backward compatibility endpoint for engagement verification"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        # Check user engagement
        engagement_data = await engagement_checker.check_user_engagement(
            request.username,
            request.tweet_id
        )

        # Check if all required actions are completed
        all_completed = True
        if request.actions:
            for action in request.actions:
                if action.lower() == 'like' and not engagement_data.get('liked', False):
                    all_completed = False
                elif action.lower() == 'retweet' and not engagement_data.get('retweeted', False):
                    all_completed = False
                elif action.lower() == 'comment' and not engagement_data.get('commented', False):
                    all_completed = False
                elif action.lower() == 'bookmark' and not engagement_data.get('bookmarked', False):
                    all_completed = False

        return VerifyEngagementResponse(
            liked=engagement_data.get('liked', False),
            retweeted=engagement_data.get('retweeted', False),
            commented=engagement_data.get('commented', False),
            bookmarked=engagement_data.get('bookmarked', False),
            all_completed=all_completed
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify-engagement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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