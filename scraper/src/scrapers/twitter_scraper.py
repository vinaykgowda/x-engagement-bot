import re
from typing import Optional, Dict, Any, List

from config import settings
from scrapers.cache_manager import cache_manager
from scrapers.rapidapi_client import rapidapi_client
from utils.logger import logger


class TwitterScraper:
    """Twitter/X scraper using RapidAPI (Twitter AIO API)"""

    def __init__(self):
        self.cache = cache_manager
        self.rapidapi = rapidapi_client

    def extract_tweet_id(self, url: str) -> Optional[str]:
        match = re.search(r'/status/(\d+)', url)
        return match.group(1) if match else None

    def extract_username(self, url: str) -> Optional[str]:
        match = re.search(r'https?://(?:twitter\.com|x\.com)/([^/\s]+)', url)
        return match.group(1) if match else None

    async def get_tweet(self, tweet_url: str) -> Optional[Dict[str, Any]]:
        """Fetch tweet data using RapidAPI"""
        try:
            tweet_id = self.extract_tweet_id(tweet_url)
            if not tweet_id:
                logger.error("Invalid tweet URL")
                return None

            # Check cache first
            cached = self.cache.get(f"tweet:{tweet_id}")
            if cached:
                logger.info(f"Cache hit for tweet {tweet_id}")
                return cached

            # Fetch from RapidAPI
            if not self.rapidapi.is_configured():
                logger.error("RapidAPI not configured. Cannot fetch tweet data.")
                return None

            logger.info(f"Fetching tweet {tweet_id} via RapidAPI")
            tweet_data = await self.rapidapi.get_tweet(tweet_id)

            if tweet_data:
                self.cache.set(f"tweet:{tweet_id}", tweet_data)

            return tweet_data

        except Exception as e:
            logger.error(f"Error fetching tweet: {e}")
            return None

    async def get_tweet_by_id(self, tweet_id: str) -> Optional[Dict[str, Any]]:
        """Fetch tweet data by ID"""
        try:
            # Check cache first
            cached = self.cache.get(f"tweet:{tweet_id}")
            if cached:
                logger.info(f"Cache hit for tweet {tweet_id}")
                return cached

            # Fetch from RapidAPI
            if not self.rapidapi.is_configured():
                logger.error("RapidAPI not configured. Cannot fetch tweet data.")
                return None

            logger.info(f"Fetching tweet {tweet_id} via RapidAPI")
            tweet_data = await self.rapidapi.get_tweet(tweet_id)

            if tweet_data:
                self.cache.set(f"tweet:{tweet_id}", tweet_data)

            return tweet_data

        except Exception as e:
            logger.error(f"Error getting tweet by ID {tweet_id}: {e}")
            return None

    async def get_tweet_likers(self, tweet_id: str, limit: int = 100) -> List[str]:
        """Get list of users who liked a tweet"""
        try:
            # Check cache first
            cache_key = f"likers:{tweet_id}"
            cached = self.cache.get(cache_key)
            if cached:
                logger.info(f"Cache hit for likers of tweet {tweet_id}")
                return cached

            # Fetch from RapidAPI
            if not self.rapidapi.is_configured():
                logger.error("RapidAPI not configured. Cannot fetch likers.")
                return []

            logger.info(f"Fetching likers for tweet {tweet_id} via RapidAPI")
            likers = await self.rapidapi.get_tweet_likers(tweet_id, limit)

            # Cache the results (5 minutes TTL for engagement data)
            if likers:
                self.cache.set(cache_key, likers, ttl=300)

            return likers

        except Exception as e:
            logger.error(f"Error getting tweet likers: {e}")
            return []

    async def get_tweet_retweeters(self, tweet_id: str, limit: int = 100) -> List[str]:
        """Get list of users who retweeted"""
        try:
            # Check cache first
            cache_key = f"retweeters:{tweet_id}"
            cached = self.cache.get(cache_key)
            if cached:
                logger.info(f"Cache hit for retweeters of tweet {tweet_id}")
                return cached

            # Fetch from RapidAPI
            if not self.rapidapi.is_configured():
                logger.error("RapidAPI not configured. Cannot fetch retweeters.")
                return []

            logger.info(f"Fetching retweeters for tweet {tweet_id} via RapidAPI")
            retweeters = await self.rapidapi.get_tweet_retweeters(tweet_id, limit)

            # Cache the results
            if retweeters:
                self.cache.set(cache_key, retweeters, ttl=300)

            return retweeters

        except Exception as e:
            logger.error(f"Error getting tweet retweeters: {e}")
            return []

    async def get_tweet_replies(self, tweet_id: str, limit: int = 100) -> List[str]:
        """Get list of users who replied to a tweet"""
        try:
            # Check cache first
            cache_key = f"repliers:{tweet_id}"
            cached = self.cache.get(cache_key)
            if cached:
                logger.info(f"Cache hit for repliers of tweet {tweet_id}")
                return cached

            # Fetch from RapidAPI
            if not self.rapidapi.is_configured():
                logger.error("RapidAPI not configured. Cannot fetch replies.")
                return []

            logger.info(f"Fetching replies for tweet {tweet_id} via RapidAPI")
            repliers = await self.rapidapi.get_tweet_replies(tweet_id, limit)

            # Cache the results
            if repliers:
                self.cache.set(cache_key, repliers, ttl=300)

            return repliers

        except Exception as e:
            logger.error(f"Error getting tweet replies: {e}")
            return []

    async def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch user profile data using RapidAPI"""
        try:
            # Check cache first
            cached = self.cache.get(f"user:{username}")
            if cached:
                logger.info(f"Cache hit for user {username}")
                return cached

            # Fetch from RapidAPI
            if not self.rapidapi.is_configured():
                logger.error("RapidAPI not configured. Cannot fetch user profile.")
                return None

            logger.info(f"Fetching user profile {username} via RapidAPI")
            user_data = await self.rapidapi.get_user_profile(username)

            # Cache the results
            if user_data:
                self.cache.set(f"user:{username}", user_data)

            return user_data

        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None

    async def close(self):
        """Cleanup method (no resources to close for RapidAPI-only implementation)"""
        logger.info("TwitterScraper cleanup complete")

twitter_scraper = TwitterScraper()