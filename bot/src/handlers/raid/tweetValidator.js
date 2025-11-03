const axios = require('axios');
const logger = require('../../config/logger');
const config = require('../../config/settings');

class TweetValidator {
  constructor() {
    // Python scraper service URL
    this.scraperApiUrl = config.SCRAPER_API_URL || 'http://localhost:8000';
  }

  /**
   * Extract tweet ID from URL
   */
  extractTweetId(tweetUrl) {
    try {
      const tweetRegex = /https?:\/\/(twitter\.com|x\.com)\/[^\/\s]+\/status\/(\d+)/i;
      const match = tweetUrl.match(tweetRegex);

      if (match && match[2]) {
        return match[2];
      }

      return null;
    } catch (error) {
      logger.error('Error extracting tweet ID:', error);
      return null;
    }
  }

  /**
   * Extract username from tweet URL
   */
  extractUsername(tweetUrl) {
    try {
      const usernameRegex = /https?:\/\/(twitter\.com|x\.com)\/([^\/\s]+)\/status\/\d+/i;
      const match = tweetUrl.match(usernameRegex);

      if (match && match[2]) {
        return match[2];
      }

      return null;
    } catch (error) {
      logger.error('Error extracting username:', error);
      return null;
    }
  }

  /**
   * Validate tweet and get engagement data
   */
  async validateTweet(tweetUrl, expectedUsername) {
    try {
      const tweetId = this.extractTweetId(tweetUrl);

      if (!tweetId) {
        return {
          valid: false,
          reason: 'Invalid tweet URL format'
        };
      }

      // Call Python scraper service to get tweet data
      const response = await axios.post(
        `${this.scraperApiUrl}/api/scraper/validate-tweet`,
        {
          tweet_url: tweetUrl,
          tweet_id: tweetId,
          expected_username: expectedUsername
        },
        {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data.success) {
        return {
          valid: false,
          reason: response.data?.error || 'Failed to validate tweet'
        };
      }

      const tweetData = response.data.data;

      // Check if tweet author matches expected username
      if (tweetData.author_username.toLowerCase() !== expectedUsername.toLowerCase()) {
        return {
          valid: false,
          reason: `Tweet author (@${tweetData.author_username}) does not match your linked profile (@${expectedUsername})`
        };
      }

      // Check if tweet is too old (e.g., older than 7 days)
      const tweetAge = Date.now() - new Date(tweetData.created_at).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (tweetAge > maxAge) {
        return {
          valid: false,
          reason: 'Tweet is too old. Only tweets from the last 7 days are accepted.'
        };
      }

      // Check if tweet exists and is accessible
      if (tweetData.deleted || tweetData.suspended) {
        return {
          valid: false,
          reason: 'Tweet is not accessible (deleted or account suspended)'
        };
      }

      // Return validation success with engagement data
      return {
        valid: true,
        engagementData: {
          likes: tweetData.likes || 0,
          retweets: tweetData.retweets || 0,
          replies: tweetData.replies || 0,
          quotes: tweetData.quotes || 0,
          bookmarks: tweetData.bookmarks || 0,
          views: tweetData.views || 0,
          created_at: tweetData.created_at,
          author_username: tweetData.author_username,
          author_display_name: tweetData.author_display_name,
          text: tweetData.text
        }
      };

    } catch (error) {
      logger.error('Error validating tweet:', error);

      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        return {
          valid: false,
          reason: 'Unable to connect to validation service. Please try again later.'
        };
      }

      if (error.response) {
        // API returned an error response
        return {
          valid: false,
          reason: error.response.data?.error || 'Tweet validation failed'
        };
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          valid: false,
          reason: 'Validation timed out. Please try again.'
        };
      }

      return {
        valid: false,
        reason: 'An error occurred during validation. Please try again later.'
      };
    }
  }

  /**
   * Check if tweet URL is valid format
   */
  isValidTweetUrl(url) {
    const tweetRegex = /^https?:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+/i;
    return tweetRegex.test(url);
  }

  /**
   * Normalize tweet URL (convert twitter.com to x.com)
   */
  normalizeTweetUrl(url) {
    return url.replace('twitter.com', 'x.com');
  }

  /**
   * Get tweet engagement (without validation)
   */
  async getTweetEngagement(tweetId) {
    try {
      const response = await axios.get(
        `${this.scraperApiUrl}/api/scraper/tweet/${tweetId}`,
        {
          timeout: 30000
        }
      );

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        error: response.data?.error || 'Failed to fetch engagement data'
      };

    } catch (error) {
      logger.error('Error getting tweet engagement:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch validate multiple tweets
   */
  async validateMultipleTweets(tweets) {
    try {
      const response = await axios.post(
        `${this.scraperApiUrl}/api/scraper/validate-batch`,
        { tweets },
        {
          timeout: 60000 // 60 second timeout for batch
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error batch validating tweets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TweetValidator();