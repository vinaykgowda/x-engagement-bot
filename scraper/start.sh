#!/bin/bash

# X Engagement Bot - Scraper Service Startup Script

echo "🚀 Starting X Engagement Scraper Service..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi" &> /dev/null; then
    echo "⚠️  Dependencies not found. Installing..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed successfully."
else
    echo "✅ Dependencies already installed."
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Check if RAPIDAPI_KEY is set
if ! grep -q "RAPIDAPI_KEY=" .env || grep -q "RAPIDAPI_KEY=$" .env || grep -q "RAPIDAPI_KEY=\"\"" .env; then
    echo "⚠️  WARNING: RAPIDAPI_KEY is not set in .env file."
    echo "   The scraper will not work without a valid RapidAPI key."
    echo "   Get your key from: https://rapidapi.com/Devomes/api/twitter-aio"
    echo ""
fi

# Read PORT from .env or default to 8000
PORT=$(grep -E "^PORT=" .env | cut -d '=' -f2 | tr -d ' ')
if [ -z "$PORT" ]; then
    PORT=8000
fi

# Read HOST from .env or default to 0.0.0.0
HOST=$(grep -E "^HOST=" .env | cut -d '=' -f2 | tr -d ' ')
if [ -z "$HOST" ]; then
    HOST="0.0.0.0"
fi

echo ""
echo "🌐 Starting server on http://${HOST}:${PORT}"
echo "📝 API Documentation: http://localhost:${PORT}/docs"
echo "🔍 Health Check: http://localhost:${PORT}/health"
echo ""
echo "Press CTRL+C to stop the server"
echo ""

# Start the server
python3 -m uvicorn main:app --reload --host ${HOST} --port ${PORT}
