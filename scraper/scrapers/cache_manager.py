import time
from typing import Optional, Any, Dict
from collections import OrderedDict
from config import settings
from utils.logger import logger

class CacheManager:
    def __init__(self):
        self.enabled = settings.CACHE_ENABLED
        self.default_ttl = settings.CACHE_TTL
        self.max_size = settings.CACHE_MAX_SIZE
        self.cache: OrderedDict = OrderedDict()
        self.ttl_map: Dict[str, float] = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None

        if key not in self.cache:
            return None

        # Check if expired
        if key in self.ttl_map:
            if time.time() > self.ttl_map[key]:
                self.delete(key)
                return None

        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return self.cache[key]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        if not self.enabled:
            return

        # Remove oldest if at max size
        if len(self.cache) >= self.max_size:
            oldest_key = next(iter(self.cache))
            self.delete(oldest_key)

        self.cache[key] = value

        # Set TTL
        if ttl is None:
            ttl = self.default_ttl

        if ttl > 0:
            self.ttl_map[key] = time.time() + ttl

        logger.debug(f"Cache set: {key}")

    def delete(self, key: str) -> None:
        """Delete value from cache"""
        if key in self.cache:
            del self.cache[key]
        if key in self.ttl_map:
            del self.ttl_map[key]
        logger.debug(f"Cache delete: {key}")

    def clear(self) -> None:
        """Clear all cache"""
        self.cache.clear()
        self.ttl_map.clear()
        logger.info("Cache cleared")

    def size(self) -> int:
        """Get cache size"""
        return len(self.cache)

    def cleanup_expired(self) -> int:
        """Remove expired entries"""
        if not self.enabled:
            return 0

        now = time.time()
        expired_keys = [
            key for key, expiry in self.ttl_map.items()
            if now > expiry
        ]

        for key in expired_keys:
            self.delete(key)

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

        return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'enabled': self.enabled,
            'size': self.size(),
            'max_size': self.max_size,
            'default_ttl': self.default_ttl
        }

cache_manager = CacheManager()