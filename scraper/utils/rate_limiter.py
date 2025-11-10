import time
from typing import Dict
from config import settings
from utils.logger import logger

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = {}
        self.max_requests = settings.RATE_LIMIT_REQUESTS
        self.window = settings.RATE_LIMIT_WINDOW

    def check_limit(self, identifier: str) -> bool:
        """Check if request is within rate limit"""
        now = time.time()

        if identifier not in self.requests:
            self.requests[identifier] = []

        # Remove old requests outside the window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window
        ]

        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for {identifier}")
            return False

        # Add current request
        self.requests[identifier].append(now)
        return True

    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests for identifier"""
        if identifier not in self.requests:
            return self.max_requests

        now = time.time()
        recent = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window
        ]

        return max(0, self.max_requests - len(recent))

    def reset(self, identifier: str) -> None:
        """Reset rate limit for identifier"""
        if identifier in self.requests:
            del self.requests[identifier]

    def cleanup(self) -> None:
        """Clean up old entries"""
        now = time.time()
        to_remove = []

        for identifier, requests in self.requests.items():
            # Remove old requests
            recent = [
                req_time for req_time in requests
                if now - req_time < self.window
            ]

            if not recent:
                to_remove.append(identifier)
            else:
                self.requests[identifier] = recent

        for identifier in to_remove:
            del self.requests[identifier]

        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} rate limit entries")

    def get_total_requests(self) -> int:
        """Get total number of tracked requests"""
        return sum(len(reqs) for reqs in self.requests.values())

rate_limiter = RateLimiter()