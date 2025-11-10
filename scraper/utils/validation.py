import re
from typing import Optional

class Validator:
    @staticmethod
    def is_valid_tweet_url(url: str) -> bool:
        """Validate tweet URL format"""
        pattern = r'^https?://(twitter\.com|x\.com)/[a-zA-Z0-9_]{1,15}/status/\d+$'
        return bool(re.match(pattern, url))

    @staticmethod
    def is_valid_username(username: str) -> bool:
        """Validate Twitter username"""
        pattern = r'^[a-zA-Z0-9_]{1,15}$'
        return bool(re.match(pattern, username.replace('@', '')))

    @staticmethod
    def extract_tweet_id(url: str) -> Optional[str]:
        """Extract tweet ID from URL"""
        match = re.search(r'/status/(\d+)', url)
        return match.group(1) if match else None

    @staticmethod
    def extract_username(url: str) -> Optional[str]:
        """Extract username from URL"""
        match = re.search(r'https?://(?:twitter\.com|x\.com)/([^/\s]+)', url)
        return match.group(1) if match else None

    @staticmethod
    def normalize_username(username: str) -> str:
        """Normalize username (remove @, lowercase)"""
        return username.replace('@', '').lower().strip()

    @staticmethod
    def normalize_url(url: str) -> str:
        """Normalize URL (use x.com, remove query params)"""
        url = url.replace('twitter.com', 'x.com')
        return url.split('?')[0].split('#')[0]

validator = Validator()