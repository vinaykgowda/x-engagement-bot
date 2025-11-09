# ============================================================================
# X Engagement Scraper Configuration
# ============================================================================

# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
DEBUG=true

# CORS Configuration
ALLOWED_ORIGINS=["*"]

# ============================================================================
# RapidAPI Configuration (Twitter AIO API)
# ============================================================================
# Get your API key from: https://rapidapi.com/Devomes/api/twitter-aio
# This API is used as the primary method for fetching Twitter/X data
# Playwright browser automation is used as fallback if this is not configured
# 👇 ADD YOUR RAPIDAPI KEY HERE 👇
RAPIDAPI_KEY=8c5133daecmshbdd77cd334421c8p1ebcb1jsn3ee414f79f3e
RAPIDAPI_HOST=twitter-aio.p.rapidapi.com
RAPIDAPI_BASE_URL=https://twitter-aio.p.rapidapi.com

# ============================================================================
# Rate Limiting Configuration
# ============================================================================
# Controls API request rate limits to prevent abuse
RATE_LIMIT_REQUESTS=100          # Max requests per window
RATE_LIMIT_WINDOW=3600           # Time window in seconds (1 hour)

# ============================================================================
# Cache Configuration
# ============================================================================
# Caching reduces API calls and improves response times
CACHE_ENABLED=true
CACHE_TTL=300                    # Default cache TTL in seconds (5 minutes)
CACHE_MAX_SIZE=1000              # Maximum number of cached items

# ============================================================================
# Request & Retry Configuration
# ============================================================================
# Controls behavior for external API requests
REQUEST_TIMEOUT=30               # Request timeout in seconds
MAX_RETRIES=3                    # Maximum retry attempts for failed requests
RETRY_DELAY=2                    # Initial delay between retries in seconds (exponential backoff)