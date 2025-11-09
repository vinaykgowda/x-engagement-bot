import re
import json
from typing import Optional, Dict, Any, List
import httpx
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

from config import settings
from scrapers.cache_manager import cache_manager
from scrapers.rapidapi_client import rapidapi_client
from utils.logger import logger

class TwitterScraper:
    def __init__(self):
        self.cache = cache_manager
        self.rapidapi = rapidapi_client
        self.playwright = None
        self.browser = None
        self.use_rapidapi = rapidapi_client.is_configured()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    async def init_browser(self):
        """Initialize Playwright browser"""
        if not self.browser:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
        return self.browser

    def extract_tweet_id(self, url: str) -> Optional[str]:
        match = re.search(r'/status/(\d+)', url)
        return match.group(1) if match else None

    def extract_username(self, url: str) -> Optional[str]:
        match = re.search(r'https?://(?:twitter\.com|x\.com)/([^/\s]+)', url)
        return match.group(1) if match else None

    async def get_tweet(self, tweet_url: str) -> Optional[Dict[str, Any]]:
        """Fetch tweet data using RapidAPI (primary) or browser automation (fallback)"""
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

            tweet_data = None

            # Try RapidAPI first if configured
            if self.use_rapidapi:
                logger.info(f"Fetching tweet {tweet_id} via RapidAPI")
                tweet_data = await self.rapidapi.get_tweet(tweet_id)

            # Fallback to browser automation if RapidAPI fails or not configured
            if not tweet_data:
                logger.info(f"Fetching tweet {tweet_id} via browser automation (fallback)")
                tweet_data = await self._scrape_tweet_with_browser(tweet_url, tweet_id)

            if tweet_data:
                self.cache.set(f"tweet:{tweet_id}", tweet_data)

            return tweet_data

        except Exception as e:
            logger.error(f"Error fetching tweet: {e}")
            return None

    async def _scrape_tweet_with_browser(self, url: str, tweet_id: str) -> Optional[Dict[str, Any]]:
        """Scrape tweet using Playwright"""
        try:
            browser = await self.init_browser()
            page = await browser.new_page()

            # Set viewport
            await page.set_viewport_size({"width": 1920, "height": 1080})

            # Go to tweet URL
            await page.goto(url, wait_until='networkidle', timeout=30000)

            # Wait for tweet to load
            await page.wait_for_selector('article[data-testid="tweet"]', timeout=10000)

            # Extract data from page
            tweet_data = await page.evaluate('''() => {
                const article = document.querySelector('article[data-testid="tweet"]');
                if (!article) return null;

                // Get username
                const usernameEl = article.querySelector('[data-testid="User-Name"] a[role="link"]');
                const username = usernameEl ? usernameEl.href.split('/').pop() : '';

                // Get display name
                const displayNameEl = article.querySelector('[data-testid="User-Name"] span');
                const displayName = displayNameEl ? displayNameEl.textContent : '';

                // Get tweet text
                const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
                const text = tweetTextEl ? tweetTextEl.textContent : '';

                // Get timestamp
                const timeEl = article.querySelector('time');
                const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';

                // Get engagement metrics
                const getLikes = () => {
                    const likeBtn = article.querySelector('[data-testid="like"]');
                    const likeText = likeBtn ? likeBtn.getAttribute('aria-label') : '';
                    const match = likeText.match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };

                const getRetweets = () => {
                    const retweetBtn = article.querySelector('[data-testid="retweet"]');
                    const retweetText = retweetBtn ? retweetBtn.getAttribute('aria-label') : '';
                    const match = retweetText.match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };

                const getReplies = () => {
                    const replyBtn = article.querySelector('[data-testid="reply"]');
                    const replyText = replyBtn ? replyBtn.getAttribute('aria-label') : '';
                    const match = replyText.match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };

                const getBookmarks = () => {
                    const bookmarkBtn = article.querySelector('[data-testid="bookmark"]');
                    const bookmarkText = bookmarkBtn ? bookmarkBtn.getAttribute('aria-label') : '';
                    const match = bookmarkText.match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };

                const getViews = () => {
                    const viewsEl = article.querySelector('[href$="/analytics"]');
                    if (viewsEl) {
                        const viewsText = viewsEl.textContent;
                        const match = viewsText.match(/([\\d,]+)/);
                        if (match) {
                            return parseInt(match[1].replace(/,/g, ''));
                        }
                    }
                    return 0;
                };

                return {
                    username: username,
                    displayName: displayName,
                    text: text,
                    timestamp: timestamp,
                    likes: getLikes(),
                    retweets: getRetweets(),
                    replies: getReplies(),
                    bookmarks: getBookmarks(),
                    views: getViews()
                };
            }''')

            await page.close()

            if not tweet_data:
                logger.error("Failed to extract tweet data from page")
                return None

            # Format response
            return {
                'tweet_id': tweet_id,
                'author_username': tweet_data['username'],
                'author_display_name': tweet_data['displayName'],
                'text': tweet_data['text'],
                'created_at': tweet_data['timestamp'],
                'likes': tweet_data['likes'],
                'retweets': tweet_data['retweets'],
                'replies': tweet_data['replies'],
                'quotes': 0,  # Not easily accessible without login
                'bookmarks': tweet_data['bookmarks'],
                'views': tweet_data['views'],
                'deleted': False,
                'suspended': False
            }

        except PlaywrightTimeout:
            logger.error(f"Timeout loading tweet: {url}")
            return None
        except Exception as e:
            logger.error(f"Error scraping tweet with browser: {e}")
            return None

    async def get_tweet_by_id(self, tweet_id: str) -> Optional[Dict[str, Any]]:
        """Fetch tweet data by ID"""
        try:
            # Check cache first
            cached = self.cache.get(f"tweet:{tweet_id}")
            if cached:
                return cached

            tweet_data = None

            # Try RapidAPI first if configured
            if self.use_rapidapi:
                logger.info(f"Fetching tweet {tweet_id} via RapidAPI")
                tweet_data = await self.rapidapi.get_tweet(tweet_id)

            # Fallback to browser automation
            if not tweet_data:
                url = f"https://x.com/i/status/{tweet_id}"
                tweet_data = await self.get_tweet(url)

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

            likers = []

            # Use RapidAPI if configured
            if self.use_rapidapi:
                logger.info(f"Fetching likers for tweet {tweet_id} via RapidAPI")
                likers = await self.rapidapi.get_tweet_likers(tweet_id, limit)
            else:
                logger.warning("RapidAPI not configured. Cannot fetch likers without API.")

            # Cache the results (shorter TTL for engagement data)
            if likers:
                self.cache.set(cache_key, likers, ttl=300)  # 5 minutes

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

            retweeters = []

            # Use RapidAPI if configured
            if self.use_rapidapi:
                logger.info(f"Fetching retweeters for tweet {tweet_id} via RapidAPI")
                retweeters = await self.rapidapi.get_tweet_retweeters(tweet_id, limit)
            else:
                logger.warning("RapidAPI not configured. Cannot fetch retweeters without API.")

            # Cache the results
            if retweeters:
                self.cache.set(cache_key, retweeters, ttl=300)  # 5 minutes

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

            repliers = []

            # Use RapidAPI if configured
            if self.use_rapidapi:
                logger.info(f"Fetching replies for tweet {tweet_id} via RapidAPI")
                repliers = await self.rapidapi.get_tweet_replies(tweet_id, limit)
            else:
                logger.warning("RapidAPI not configured. Cannot fetch replies without API.")

            # Cache the results
            if repliers:
                self.cache.set(cache_key, repliers, ttl=300)  # 5 minutes

            return repliers

        except Exception as e:
            logger.error(f"Error getting tweet replies: {e}")
            return []

    async def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch user profile data using RapidAPI (primary) or browser automation (fallback)"""
        try:
            # Check cache first
            cached = self.cache.get(f"user:{username}")
            if cached:
                logger.info(f"Cache hit for user {username}")
                return cached

            user_data = None

            # Try RapidAPI first if configured
            if self.use_rapidapi:
                logger.info(f"Fetching user profile {username} via RapidAPI")
                user_data = await self.rapidapi.get_user_profile(username)

            # Fallback to browser automation if RapidAPI fails
            if not user_data:
                logger.info(f"Fetching user profile {username} via browser automation (fallback)")
                user_data = await self._scrape_user_profile_with_browser(username)

            # Cache the results
            if user_data:
                self.cache.set(f"user:{username}", user_data)

            return user_data

        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None

    async def _scrape_user_profile_with_browser(self, username: str) -> Optional[Dict[str, Any]]:
        """Scrape user profile using browser automation"""
        try:
            browser = await self.init_browser()
            page = await browser.new_page()

            url = f"https://x.com/{username}"
            await page.goto(url, wait_until='networkidle', timeout=30000)

            # Wait for profile to load
            await page.wait_for_selector('[data-testid="UserName"]', timeout=10000)

            # Extract profile data
            profile_data = await page.evaluate('''() => {
                const getFollowers = () => {
                    const followersEl = document.querySelector('a[href$="/verified_followers"] span');
                    if (followersEl) {
                        const text = followersEl.textContent;
                        const match = text.match(/([\\d.]+)([KMB]?)/);
                        if (match) {
                            let num = parseFloat(match[1]);
                            const suffix = match[2];
                            if (suffix === 'K') num *= 1000;
                            if (suffix === 'M') num *= 1000000;
                            if (suffix === 'B') num *= 1000000000;
                            return Math.floor(num);
                        }
                    }
                    return 0;
                };

                const getFollowing = () => {
                    const followingEl = document.querySelector('a[href$="/following"] span');
                    if (followingEl) {
                        const text = followingEl.textContent;
                        const match = text.match(/([\\d.]+)([KMB]?)/);
                        if (match) {
                            let num = parseFloat(match[1]);
                            const suffix = match[2];
                            if (suffix === 'K') num *= 1000;
                            if (suffix === 'M') num *= 1000000;
                            if (suffix === 'B') num *= 1000000000;
                            return Math.floor(num);
                        }
                    }
                    return 0;
                };

                const displayNameEl = document.querySelector('[data-testid="UserName"]');
                const bioEl = document.querySelector('[data-testid="UserDescription"]');
                const verifiedEl = document.querySelector('[data-testid="icon-verified"]');

                return {
                    displayName: displayNameEl ? displayNameEl.textContent.split('@')[0].trim() : '',
                    bio: bioEl ? bioEl.textContent : null,
                    followers: getFollowers(),
                    following: getFollowing(),
                    verified: !!verifiedEl
                };
            }''')

            await page.close()

            user_data = {
                'username': username,
                'display_name': profile_data['displayName'],
                'bio': profile_data['bio'],
                'followers': profile_data['followers'],
                'following': profile_data['following'],
                'tweets_count': 0,
                'verified': profile_data['verified'],
                'created_at': None
            }

            self.cache.set(f"user:{username}", user_data)
            return user_data

        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None

    async def close(self):
        """Close browser and playwright"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

twitter_scraper = TwitterScraper()