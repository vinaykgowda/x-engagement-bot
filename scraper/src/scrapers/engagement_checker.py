from typing import Dict
from scrapers.cache_manager import cache_manager
from scrapers.twitter_scraper import twitter_scraper
from utils.logger import logger

class EngagementChecker:
    def __init__(self):
        self.cache = cache_manager

    async def check_user_engagement(self, username: str, tweet_id: str) -> Dict[str, bool]:
        """Check if user has engaged with a tweet"""
        try:
            cache_key = f"engagement:{username}:{tweet_id}"
            cached = self.cache.get(cache_key)
            if cached:
                logger.info(f"Cache hit for engagement check: {username} on {tweet_id}")
                return cached

            # Check all engagement types
            engagement_data = await self._check_all_engagements(username, tweet_id)

            # Cache for short time (60 seconds)
            self.cache.set(cache_key, engagement_data, ttl=60)

            return engagement_data

        except Exception as e:
            logger.error(f"Error checking engagement: {e}")
            return {
                'liked': False,
                'retweeted': False,
                'commented': False,
                'bookmarked': False
            }

    async def _check_all_engagements(self, username: str, tweet_id: str) -> Dict[str, bool]:
        """Check all engagement types using Twitter AIO API"""
        try:
            # Normalize username (remove @ if present)
            username = username.replace('@', '').lower()

            # Check likes
            liked = await self.check_like(username, tweet_id)

            # Check retweets
            retweeted = await self.check_retweet(username, tweet_id)

            # Check comments/replies
            commented = await self.check_comment(username, tweet_id)

            # Bookmarks cannot be checked (private)
            bookmarked = False

            return {
                'liked': liked,
                'retweeted': retweeted,
                'commented': commented,
                'bookmarked': bookmarked
            }

        except Exception as e:
            logger.error(f"Error checking all engagements: {e}")
            return {
                'liked': False,
                'retweeted': False,
                'commented': False,
                'bookmarked': False
            }

    async def check_like(self, username: str, tweet_id: str) -> bool:
        """Check if user liked the tweet"""
        try:
            username = username.replace('@', '').lower()

            # Get list of users who liked the tweet
            likers = await twitter_scraper.get_tweet_likers(tweet_id)

            if not likers:
                logger.warning(f"Could not get likers for tweet {tweet_id}")
                return False

            # Check if username is in the list (case-insensitive)
            likers_lower = [liker.lower() for liker in likers]

            if username in likers_lower:
                logger.info(f"User {username} liked tweet {tweet_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking like: {e}")
            return False

    async def check_retweet(self, username: str, tweet_id: str) -> bool:
        """Check if user retweeted"""
        try:
            username = username.replace('@', '').lower()

            # Get list of users who retweeted
            retweeters = await twitter_scraper.get_tweet_retweeters(tweet_id)

            if not retweeters:
                logger.warning(f"Could not get retweeters for tweet {tweet_id}")
                return False

            # Check if username is in the list
            retweeters_lower = [rt.lower() for rt in retweeters]

            if username in retweeters_lower:
                logger.info(f"User {username} retweeted tweet {tweet_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking retweet: {e}")
            return False

    async def check_comment(self, username: str, tweet_id: str) -> bool:
        """Check if user commented/replied"""
        try:
            username = username.replace('@', '').lower()

            # Get list of users who replied
            repliers = await twitter_scraper.get_tweet_replies(tweet_id)

            if not repliers:
                logger.warning(f"Could not get replies for tweet {tweet_id}")
                return False

            # Check if username is in the list
            repliers_lower = [r.lower() for r in repliers]

            if username in repliers_lower:
                logger.info(f"User {username} commented on tweet {tweet_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking comment: {e}")
            return False

    async def check_bookmark(self, username: str, tweet_id: str) -> bool:
        """Check if user bookmarked (not accessible without authentication)"""
        # Bookmarks are private and cannot be checked via API
        logger.info("Bookmarks cannot be checked - private data")
        return False

    async def get_engagement_summary(self, tweet_id: str) -> Dict[str, int]:
        """Get engagement summary (counts)"""
        try:
            tweet_data = await twitter_scraper.get_tweet_by_id(tweet_id)

            if not tweet_data:
                return {
                    'likes': 0,
                    'retweets': 0,
                    'replies': 0,
                    'quotes': 0,
                    'views': 0
                }

            return {
                'likes': tweet_data.get('likes', 0),
                'retweets': tweet_data.get('retweets', 0),
                'replies': tweet_data.get('replies', 0),
                'quotes': tweet_data.get('quotes', 0),
                'views': tweet_data.get('views', 0)
            }

        except Exception as e:
            logger.error(f"Error getting engagement summary: {e}")
            return {
                'likes': 0,
                'retweets': 0,
                'replies': 0,
                'quotes': 0,
                'views': 0
            }

engagement_checker = EngagementChecker()