from typing import Dict
from playwright.async_api import TimeoutError as PlaywrightTimeout

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

            engagement_data = await self._check_engagements(username, tweet_id)

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

    async def _check_engagements(self, username: str, tweet_id: str) -> Dict[str, bool]:
        """Check all engagement types using browser automation"""
        try:
            browser = await twitter_scraper.init_browser()
            page = await browser.new_page()

            tweet_url = f"https://x.com/i/status/{tweet_id}"

            # Go to tweet
            await page.goto(tweet_url, wait_until='networkidle', timeout=30000)
            await page.wait_for_selector('article[data-testid="tweet"]', timeout=10000)

            engagements = {
                'liked': False,
                'retweeted': False,
                'commented': False,
                'bookmarked': False
            }

            # Check likes
            liked = await self._check_likes(page, tweet_id, username)
            engagements['liked'] = liked

            # Check retweets
            retweeted = await self._check_retweets(page, tweet_id, username)
            engagements['retweeted'] = retweeted

            # Check replies/comments
            commented = await self._check_replies(page, tweet_id, username)
            engagements['commented'] = commented

            await page.close()

            return engagements

        except Exception as e:
            logger.error(f"Error checking engagements: {e}")
            return {
                'liked': False,
                'retweeted': False,
                'commented': False,
                'bookmarked': False
            }

    async def _check_likes(self, page, tweet_id: str, username: str) -> bool:
        """Check if user liked the tweet"""
        try:
            # Click on likes count to see who liked
            likes_button = await page.query_selector('[data-testid="like"]')
            if not likes_button:
                return False

            # Get parent link that leads to likes page
            likes_link = await page.query_selector(f'a[href$="/status/{tweet_id}/likes"]')
            if likes_link:
                await likes_link.click()
                await page.wait_for_timeout(2000)

                # Check if username appears in likes list
                liked_users = await page.query_selector_all('[data-testid="UserCell"]')

                for user_cell in liked_users[:20]:  # Check first 20 users
                    user_text = await user_cell.text_content()
                    if username.lower() in user_text.lower():
                        await page.go_back()
                        return True

                await page.go_back()

            return False

        except Exception as e:
            logger.error(f"Error checking likes: {e}")
            return False

    async def _check_retweets(self, page, tweet_id: str, username: str) -> bool:
        """Check if user retweeted"""
        try:
            # Click on retweets to see who retweeted
            retweets_link = await page.query_selector(f'a[href$="/status/{tweet_id}/retweets"]')
            if retweets_link:
                await retweets_link.click()
                await page.wait_for_timeout(2000)

                # Check if username appears in retweets list
                retweeted_users = await page.query_selector_all('[data-testid="UserCell"]')

                for user_cell in retweeted_users[:20]:
                    user_text = await user_cell.text_content()
                    if username.lower() in user_text.lower():
                        await page.go_back()
                        return True

                await page.go_back()

            return False

        except Exception as e:
            logger.error(f"Error checking retweets: {e}")
            return False

    async def _check_replies(self, page, tweet_id: str, username: str) -> bool:
        """Check if user replied to the tweet"""
        try:
            # Scroll down to load replies
            await page.evaluate('window.scrollBy(0, 1000)')
            await page.wait_for_timeout(2000)

            # Look for replies from the username
            replies = await page.query_selector_all('article[data-testid="tweet"]')

            for reply in replies[1:]:  # Skip first (original tweet)
                reply_text = await reply.text_content()
                if username.lower() in reply_text.lower():
                    # Check if it's actually replying to our tweet
                    reply_link = await reply.query_selector('a[href*="/status/"]')
                    if reply_link:
                        href = await reply_link.get_attribute('href')
                        # Check if reply is from our target username
                        if f'/{username}/' in href.lower():
                            return True

            return False

        except Exception as e:
            logger.error(f"Error checking replies: {e}")
            return False

    async def check_like(self, username: str, tweet_id: str) -> bool:
        """Check if user liked a tweet"""
        engagement = await self.check_user_engagement(username, tweet_id)
        return engagement['liked']

    async def check_retweet(self, username: str, tweet_id: str) -> bool:
        """Check if user retweeted"""
        engagement = await self.check_user_engagement(username, tweet_id)
        return engagement['retweeted']

    async def check_comment(self, username: str, tweet_id: str) -> bool:
        """Check if user commented"""
        engagement = await self.check_user_engagement(username, tweet_id)
        return engagement['commented']

    async def check_bookmark(self, username: str, tweet_id: str) -> bool:
        """Check if user bookmarked (not accessible without login)"""
        # Bookmarks are private and can't be checked without authentication
        return False

engagement_checker = EngagementChecker()