# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
DEBUG=true

# CORS
ALLOWED_ORIGINS=["*"]

# RapidAPI Configuration (Twitter AIO)
# 👇 ADD YOUR RAPIDAPI KEY HERE 👇
RAPIDAPI_KEY=8c5133daecmshbdd77cd334421c8p1ebcb1jsn3ee414f79f3e
RAPIDAPI_HOST=twitter-aio.p.rapidapi.com
RAPIDAPI_BASE_URL=https://twitter-aio.p.rapidapi.com

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Cache Settings
CACHE_ENABLED=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# Scraping Configuration
REQUEST_TIMEOUT=30
MAX_RETRIES=3
RETRY_DELAY=2