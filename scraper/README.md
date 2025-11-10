# X Engagement Bot - Scraper Service

Python FastAPI service for scraping and validating X (Twitter) engagements.

## Prerequisites

- Python 3.8+
- RapidAPI account with Twitter AIO API subscription
- pip package manager

## Quick Start

### 1. Install Dependencies

From the `scraper` directory:

```bash
pip install -r requirements.txt
```

Or if you prefer pip3:

```bash
pip3 install -r requirements.txt
```

### 2. Configuration

The configuration is stored in `.env` file. Make sure you have a valid RapidAPI key.

Key configuration:
- `RAPIDAPI_KEY` - Your RapidAPI key for Twitter AIO API (REQUIRED)
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)

### 3. Run the Server

#### Option 1: Using uvicorn directly

```bash
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Option 2: Using the Python script

```bash
python3 main.py
```

### 4. Verify It's Running

Visit http://localhost:8000 in your browser. You should see:

```json
{
  "service": "X Engagement Scraper API",
  "version": "1.0.0",
  "status": "running"
}
```

Or check the health endpoint: http://localhost:8000/health

## API Endpoints

### Core Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `GET /api/scraper/health` - Detailed health check

### Scraper Endpoints

- `POST /api/scraper/validate-tweet` - Validate a tweet exists
- `POST /api/scraper/check-engagement` - Check user engagement on a tweet
- `POST /api/scraper/verify-tweet` - Verify tweet contains specific text
- `GET /api/scraper/tweet/{tweet_id}` - Get tweet details
- `GET /api/scraper/user/{username}` - Get user profile
- `POST /api/scraper/batch-validate` - Validate multiple tweets
- `POST /api/scraper/search-tweets` - Search tweets by query

### Legacy Endpoints

- `POST /api/verify-engagement` - Backward compatibility endpoint

## Troubleshooting

### ImportError: attempted relative import beyond top-level package

**Fixed!** The scraper now has proper `__init__.py` files in all module directories.

### Connection Timeout (ETIMEDOUT)

If the Discord bot can't connect to the scraper:

1. Make sure the scraper is running: `python3 main.py`
2. Check the scraper is listening on the correct port:
   ```bash
   curl http://localhost:8000/health
   ```
3. Verify the bot's `.env` has correct `SCRAPER_API_URL`:
   ```
   SCRAPER_API_URL=http://localhost:8000
   ```

### RapidAPI Key Issues

If you see errors about missing API key:

1. Make sure `RAPIDAPI_KEY` is set in `.env`
2. Verify your RapidAPI subscription is active
3. Check your API usage limits on RapidAPI dashboard

### Port Already in Use

If port 8000 is already in use, change it in `.env`:

```env
PORT=8001
```

And update the bot's `.env`:

```env
SCRAPER_API_URL=http://localhost:8001
```

## Development

### File Structure

```
scraper/
├── main.py              # FastAPI application entry point
├── config.py            # Settings and configuration
├── .env                 # Environment variables
├── requirements.txt     # Python dependencies
├── api/
│   ├── __init__.py     # Package init
│   ├── routes.py       # API route handlers
│   └── models.py       # Pydantic request/response models
├── scrapers/
│   ├── __init__.py     # Package init
│   ├── twitter_scraper.py      # Twitter API client
│   ├── engagement_checker.py   # Engagement verification
│   ├── rapidapi_client.py      # RapidAPI wrapper
│   └── cache_manager.py        # Response caching
└── utils/
    ├── __init__.py     # Package init
    ├── logger.py       # Logging configuration
    ├── rate_limiter.py # Rate limiting
    └── validation.py   # Input validation
```

### Running in Production

For production, use a proper ASGI server with multiple workers:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or use gunicorn with uvicorn workers:

```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## API Documentation

When the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables Reference

See `.env` file for all available configuration options.

## Support

For issues or questions:
1. Check the bot logs for error messages
2. Verify your RapidAPI key is valid
3. Ensure all dependencies are installed
4. Check the health endpoint for service status
