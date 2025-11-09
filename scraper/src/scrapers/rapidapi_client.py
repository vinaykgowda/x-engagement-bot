import httpx
import asyncio
from typing import Optional, Dict, Any, List
from config import settings
from utils.logger import logger


class RapidAPIClient:
    """Client for Twitter AIO RapidAPI with retry logic and error handling"""

    def __init__(self):
        self.base_url = settings.RAPIDAPI_BASE_URL
        self.headers = {
            "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
            "X-RapidAPI-Host": settings.RAPIDAPI_HOST
        }
        self.timeout = settings.REQUEST_TIMEOUT
        self.max_retries = settings.MAX_RETRIES
        self.retry_delay = settings.RETRY_DELAY

    async def _request(self, method: str, endpoint: str, params: Optional[Dict] = None,
                      json_data: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
        """Make HTTP request with retry logic"""
        url = f"{self.base_url}{endpoint}"

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.request(
                        method=method,
                        url=url,
                        headers=self.headers,
                        params=params,
                        json=json_data,
                        timeout=self.timeout
                    )

                    response.raise_for_status()
                    return response.json()

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error {e.response.status_code} for {endpoint}: {e}")
                if e.response.status_code == 429:  # Rate limit
                    if attempt < self.max_retries - 1:
                        wait_time = self.retry_delay * (2 ** attempt)  # Exponential backoff
                        logger.info(f"Rate limited. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                elif e.response.status_code >= 500:  # Server error
                    if attempt < self.max_retries - 1:
                        wait_time = self.retry_delay * (2 ** attempt)
                        logger.info(f"Server error. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                return None

            except httpx.RequestError as e:
                logger.error(f"Request error for {endpoint}: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.info(f"Request failed. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                return None

            except Exception as e:
                logger.error(f"Unexpected error for {endpoint}: {e}")
                return None

        logger.error(f"Max retries exceeded for {endpoint}")
        return None

    async def get_tweet(self, tweet_id: str) -> Optional[Dict[str, Any]]:
        """Get tweet details by ID"""
        try:
            data = await self._request("GET", "/v1/tweet", params={"tweet_id": tweet_id})

            if not data:
                return None

            # Map RapidAPI response to our format
            tweet = data.get('data', {})

            return {
                'tweet_id': tweet_id,
                'author_username': tweet.get('user', {}).get('screen_name', ''),
                'author_display_name': tweet.get('user', {}).get('name', ''),
                'text': tweet.get('full_text', tweet.get('text', '')),
                'created_at': tweet.get('created_at', ''),
                'likes': tweet.get('favorite_count', 0),
                'retweets': tweet.get('retweet_count', 0),
                'replies': tweet.get('reply_count', 0),
                'quotes': tweet.get('quote_count', 0),
                'bookmarks': tweet.get('bookmark_count', 0),
                'views': tweet.get('views', {}).get('count', 0) if isinstance(tweet.get('views'), dict) else 0,
                'deleted': False,
                'suspended': False
            }

        except Exception as e:
            logger.error(f"Error getting tweet {tweet_id}: {e}")
            return None

    async def get_tweet_likers(self, tweet_id: str, limit: int = 100) -> List[str]:
        """Get list of users who liked a tweet"""
        try:
            data = await self._request("GET", "/v1/tweet/likers",
                                      params={"tweet_id": tweet_id, "count": min(limit, 100)})

            if not data:
                return []

            users = data.get('data', {}).get('users', [])
            return [user.get('screen_name', '').lower() for user in users if user.get('screen_name')]

        except Exception as e:
            logger.error(f"Error getting likers for tweet {tweet_id}: {e}")
            return []

    async def get_tweet_retweeters(self, tweet_id: str, limit: int = 100) -> List[str]:
        """Get list of users who retweeted"""
        try:
            data = await self._request("GET", "/v1/tweet/retweeters",
                                      params={"tweet_id": tweet_id, "count": min(limit, 100)})

            if not data:
                return []

            users = data.get('data', {}).get('users', [])
            return [user.get('screen_name', '').lower() for user in users if user.get('screen_name')]

        except Exception as e:
            logger.error(f"Error getting retweeters for tweet {tweet_id}: {e}")
            return []

    async def get_tweet_replies(self, tweet_id: str, limit: int = 100) -> List[str]:
        """Get list of users who replied to a tweet"""
        try:
            data = await self._request("GET", "/v1/tweet/replies",
                                      params={"tweet_id": tweet_id, "count": min(limit, 100)})

            if not data:
                return []

            # Extract unique usernames from replies
            replies = data.get('data', {}).get('replies', [])
            usernames = set()

            for reply in replies:
                username = reply.get('user', {}).get('screen_name', '')
                if username:
                    usernames.add(username.lower())

            return list(usernames)

        except Exception as e:
            logger.error(f"Error getting replies for tweet {tweet_id}: {e}")
            return []

    async def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user profile by username"""
        try:
            data = await self._request("GET", "/v1/user/details",
                                      params={"username": username})

            if not data:
                return None

            user = data.get('data', {})

            return {
                'username': user.get('screen_name', username),
                'display_name': user.get('name', ''),
                'bio': user.get('description', ''),
                'followers': user.get('followers_count', 0),
                'following': user.get('friends_count', 0),
                'tweets_count': user.get('statuses_count', 0),
                'verified': user.get('verified', False),
                'created_at': user.get('created_at', '')
            }

        except Exception as e:
            logger.error(f"Error getting user profile {username}: {e}")
            return None

    async def search_tweets(self, query: str, count: int = 20) -> List[Dict[str, Any]]:
        """Search tweets by query"""
        try:
            data = await self._request("GET", "/v1/search",
                                      params={"query": query, "count": min(count, 100)})

            if not data:
                return []

            tweets = data.get('data', {}).get('tweets', [])
            results = []

            for tweet in tweets:
                results.append({
                    'tweet_id': tweet.get('id_str', ''),
                    'author_username': tweet.get('user', {}).get('screen_name', ''),
                    'author_display_name': tweet.get('user', {}).get('name', ''),
                    'text': tweet.get('full_text', tweet.get('text', '')),
                    'created_at': tweet.get('created_at', ''),
                    'likes': tweet.get('favorite_count', 0),
                    'retweets': tweet.get('retweet_count', 0),
                    'replies': tweet.get('reply_count', 0)
                })

            return results

        except Exception as e:
            logger.error(f"Error searching tweets: {e}")
            return []

    def is_configured(self) -> bool:
        """Check if RapidAPI is properly configured"""
        return bool(settings.RAPIDAPI_KEY and settings.RAPIDAPI_HOST)


# Singleton instance
rapidapi_client = RapidAPIClient()
