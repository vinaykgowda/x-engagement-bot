import axios from 'axios';
import logger from '../../config/logger.js';

class ScraperClient {
  constructor() {
    this.baseUrl = process.env.SCRAPER_API_URL || 'http://localhost:8000';
    this.timeout = 30000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async request(method, endpoint, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      timeout: options.timeout || this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios(config);
        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts && this.shouldRetry(error)) {
          await this.sleep(this.retryDelay * attempt);
          continue;
        }
        
        break;
      }
    }

    logger.error(`Scraper API request failed: ${endpoint}`, lastError);
    return {
      success: false,
      error: this.formatError(lastError)
    };
  }

  shouldRetry(error) {
    if (!error.response) return true;
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  formatError(error) {
    if (!error.response) {
      return error.code === 'ECONNREFUSED' 
        ? 'Scraper service unavailable'
        : error.message;
    }
    return error.response.data?.error || error.message;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateTweet(tweetUrl, expectedUsername) {
    return await this.request('POST', '/api/scraper/validate-tweet', {
      tweet_url: tweetUrl,
      expected_username: expectedUsername
    });
  }

  async getTweetEngagement(tweetId) {
    return await this.request('GET', `/api/scraper/tweet/${tweetId}`);
  }

  async verifyTweetContent(tweetUrl, expectedUsername, expectedCode) {
    return await this.request('POST', '/api/scraper/verify-tweet', {
      tweet_url: tweetUrl,
      expected_username: expectedUsername,
      expected_code: expectedCode
    });
  }

  async checkUserEngagement(username, tweetId) {
    return await this.request('POST', '/api/scraper/check-engagement', {
      username,
      tweet_id: tweetId
    });
  }

  async getUserProfile(username) {
    return await this.request('GET', `/api/scraper/user/${username}`);
  }

  async batchValidateTweets(tweets) {
    return await this.request('POST', '/api/scraper/validate-batch', {
      tweets
    });
  }

  async searchTweets(query, options = {}) {
    return await this.request('POST', '/api/scraper/search', {
      query,
      ...options
    });
  }

  async healthCheck() {
    return await this.request('GET', '/health');
  }

  async getStats() {
    return await this.request('GET', '/api/scraper/stats');
  }
}

export default new ScraperClient();
