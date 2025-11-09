from fastapi import APIRouter, HTTPException, Depends
from typing import List

from api.models import (
    ValidateTweetRequest,
    ValidateTweetResponse,
    CheckEngagementRequest,
    CheckEngagementResponse,
    VerifyTweetRequest,
    VerifyTweetResponse,
    GetTweetResponse,
    GetUserProfileResponse,
    BatchValidateRequest,
    BatchValidateResponse,
    SearchTweetsRequest,
    SearchTweetsResponse,
    SearchTweetResult,
    VerifyEngagementRequest,
    VerifyEngagementResponse
)
from scrapers.twitter_scraper import twitter_scraper
from scrapers.engagement_checker import engagement_checker
from utils.rate_limiter import rate_limiter
from utils.logger import logger
from config import settings

router = APIRouter(prefix="/scraper", tags=["scraper"])

@router.post("/validate-tweet", response_model=ValidateTweetResponse)
async def validate_tweet(request: ValidateTweetRequest):
    """Validate a tweet and get engagement data"""
    try:
        # Check RapidAPI key is configured
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        if not rate_limiter.check_limit(request.expected_username):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        tweet_data = await twitter_scraper.get_tweet(request.tweet_url)

        if not tweet_data:
            return ValidateTweetResponse(
                success=False,
                error="Failed to fetch tweet data"
            )

        # Verify author matches
        if tweet_data['author_username'].lower() != request.expected_username.lower():
            return ValidateTweetResponse(
                success=False,
                error=f"Tweet author does not match expected username"
            )

        return ValidateTweetResponse(
            success=True,
            data=tweet_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating tweet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tweet/{tweet_id}", response_model=GetTweetResponse)
async def get_tweet(tweet_id: str):
    """Get tweet engagement data by ID"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        tweet_data = await twitter_scraper.get_tweet_by_id(tweet_id)

        if not tweet_data:
            raise HTTPException(status_code=404, detail="Tweet not found")

        return GetTweetResponse(success=True, data=tweet_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tweet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-engagement", response_model=CheckEngagementResponse)
async def check_engagement(request: CheckEngagementRequest):
    """Check if user has engaged with a tweet"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        if not rate_limiter.check_limit(request.username):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        engagement_data = await engagement_checker.check_user_engagement(
            request.username,
            request.tweet_id
        )

        return CheckEngagementResponse(
            success=True,
            data=engagement_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking engagement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-tweet", response_model=VerifyTweetResponse)
async def verify_tweet(request: VerifyTweetRequest):
    """Verify tweet contains verification code"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        tweet_data = await twitter_scraper.get_tweet(request.tweet_url)

        if not tweet_data:
            return VerifyTweetResponse(
                success=False,
                error="Failed to fetch tweet"
            )

        # Verify author
        if tweet_data['author_username'].lower() != request.expected_username.lower():
            return VerifyTweetResponse(
                success=False,
                error="Tweet author does not match"
            )

        # Verify code is in tweet text
        if request.expected_code not in tweet_data['text']:
            return VerifyTweetResponse(
                success=False,
                error="Verification code not found in tweet"
            )

        return VerifyTweetResponse(
            success=True,
            verified=True,
            author=tweet_data['author_username'],
            content=tweet_data['text'],
            timestamp=tweet_data['created_at']
        )

    except Exception as e:
        logger.error(f"Error verifying tweet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{username}", response_model=GetUserProfileResponse)
async def get_user_profile(username: str):
    """Get user profile data"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        user_data = await twitter_scraper.get_user_profile(username)

        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        return GetUserProfileResponse(success=True, data=user_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-batch", response_model=BatchValidateResponse)
async def validate_batch(request: BatchValidateRequest):
    """Batch validate multiple tweets"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        results = []
        for tweet_request in request.tweets:
            try:
                # Validate each tweet
                tweet_data = await twitter_scraper.get_tweet(tweet_request.tweet_url)

                if not tweet_data:
                    results.append(ValidateTweetResponse(
                        success=False,
                        error="Failed to fetch tweet data"
                    ))
                    continue

                # Verify author matches
                if tweet_data['author_username'].lower() != tweet_request.expected_username.lower():
                    results.append(ValidateTweetResponse(
                        success=False,
                        error=f"Tweet author does not match expected username"
                    ))
                    continue

                results.append(ValidateTweetResponse(
                    success=True,
                    data=tweet_data
                ))

            except Exception as e:
                logger.error(f"Error validating tweet in batch: {e}")
                results.append(ValidateTweetResponse(
                    success=False,
                    error=str(e)
                ))

        return BatchValidateResponse(success=True, results=results)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=SearchTweetsResponse)
async def search_tweets(request: SearchTweetsRequest):
    """Search tweets by query"""
    try:
        if not settings.RAPIDAPI_KEY:
            raise HTTPException(status_code=500, detail="RapidAPI key not configured")

        if not rate_limiter.check_limit("search"):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        # Use RapidAPI client to search tweets
        from scrapers.rapidapi_client import rapidapi_client

        tweet_results = await rapidapi_client.search_tweets(request.query, request.count)

        results = [
            SearchTweetResult(**tweet) for tweet in tweet_results
        ]

        return SearchTweetsResponse(
            success=True,
            results=results,
            count=len(results)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching tweets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    """Get scraper statistics"""
    return {
        "api_configured": bool(settings.RAPIDAPI_KEY),
        "cache_size": twitter_scraper.cache.size(),
        "requests_today": rate_limiter.get_total_requests(),
        "status": "operational" if settings.RAPIDAPI_KEY else "api_key_missing"
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    api_configured = bool(settings.RAPIDAPI_KEY)

    return {
        "status": "healthy" if api_configured else "configuration_error",
        "api_configured": api_configured,
        "environment": settings.ENVIRONMENT,
        "message": "OK" if api_configured else "RapidAPI key not configured"
    }