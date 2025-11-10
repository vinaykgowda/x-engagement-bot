# How to Run the X Engagement Scraper

## Quick Start

### Prerequisites
```bash
cd scraper
pip install -r requirements.txt
```

Make sure your `config.py` has a valid `RAPIDAPI_KEY`.

---

## 🚀 Starting the Scraper

### ✅ Method 1: Direct Python (Recommended)
```bash
cd scraper
python3 main.py
```

This will start the server using the settings from `config.py`:
- Host: 0.0.0.0 (from config)
- Port: 8000 (from config)
- Auto-reload: Based on DEBUG flag

**Output:**
```
INFO:     Starting X Engagement Scraper Service
INFO:     Environment: development
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### ✅ Method 2: Using Uvicorn CLI
```bash
cd scraper
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Important:** Use `main:app` (NOT `src.main:app`)

---

### ❌ WRONG Commands (Don't Use These)

```bash
# ❌ This won't work - no src/ directory
python3 -m uvicorn src.main:app --reload

# ❌ This won't work - wrong path
python3 -m uvicorn scraper.main:app --reload

# ❌ This won't work - need to be IN the scraper directory
python3 main.py  # (from project root)
```

---

## 📍 Directory Structure

```
x-engagement-bot/
├── bot/              # Discord bot (Node.js)
│   ├── src/
│   └── package.json
└── scraper/          # Python scraper (THIS IS WHERE YOU RUN COMMANDS)
    ├── main.py       # ← Entry point
    ├── config.py     # ← Configuration
    ├── requirements.txt
    ├── api/
    ├── scrapers/
    └── utils/
```

**Always run commands from the `scraper/` directory!**

---

## 🔍 Verifying It Works

### Check Health Endpoint
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "environment": "development"
}
```

### Check API Status
```bash
curl http://localhost:8000/api/scraper/stats
```

**Expected Response:**
```json
{
  "api_configured": true,
  "cache_size": 0,
  "requests_today": 0,
  "status": "operational"
}
```

### Check Root Endpoint
```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "service": "X Engagement Scraper API",
  "version": "1.0.0",
  "status": "running"
}
```

---

## 🐛 Troubleshooting

### Error: `ModuleNotFoundError: No module named 'config'`

**Cause:** You're not in the right directory

**Fix:**
```bash
cd scraper  # Make sure you're IN the scraper directory
python3 main.py
```

---

### Error: `ModuleNotFoundError: No module named 'fastapi'`

**Cause:** Dependencies not installed

**Fix:**
```bash
pip install -r requirements.txt
```

---

### Error: `RapidAPI key not configured`

**Cause:** Missing or invalid API key in `config.py`

**Fix:**
1. Open `scraper/config.py`
2. Add your RapidAPI key:
   ```python
   RAPIDAPI_KEY=your_key_here
   ```
3. Get a key from: https://rapidapi.com/Devomes/api/twitter-aio

---

### Error: `Address already in use`

**Cause:** Port 8000 is already being used

**Fix:**
```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use a different port
python3 -m uvicorn main:app --port 8001
```

---

## 🔧 Configuration Options

### Environment Variables (config.py)

```python
# Server Configuration
HOST = 0.0.0.0      # Listen on all interfaces
PORT = 8000          # Default port
DEBUG = true         # Enable auto-reload

# RapidAPI (REQUIRED)
RAPIDAPI_KEY = your_key_here

# Rate Limiting
RATE_LIMIT_REQUESTS = 100  # Max requests per window
RATE_LIMIT_WINDOW = 3600   # Time window (1 hour)

# Cache
CACHE_TTL = 300            # Cache duration (5 minutes)
CACHE_MAX_SIZE = 1000      # Max cached items

# Retry Logic
MAX_RETRIES = 3            # Retry failed requests 3 times
RETRY_DELAY = 2            # Initial delay (exponential backoff)
```

---

## 📝 Development vs Production

### Development (Auto-reload enabled)
```bash
cd scraper
python3 main.py  # Uses DEBUG=true from config
```

### Production (No auto-reload, multiple workers)
```bash
cd scraper
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 🌐 Running with Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "main.py"]
```

```bash
docker build -t x-scraper .
docker run -p 8000:8000 x-scraper
```

---

## ✅ Summary

**Correct command:**
```bash
cd scraper
python3 main.py
```

**Or:**
```bash
cd scraper
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Remember:**
- ✅ Always run from the `scraper/` directory
- ✅ Use `main:app` (NOT `src.main:app`)
- ✅ Ensure RapidAPI key is configured
- ✅ Check health endpoint to verify it's working
