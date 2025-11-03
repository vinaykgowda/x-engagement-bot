// ============================================================================
// FILE 2: bot/src/handlers/engagement/verificationQueue.js
// ============================================================================

import logger from '../../config/logger.js';
import axios from 'axios';
import settings from '../../config/settings.js';

class VerificationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.rateLimitDelay = 2000; // 2 seconds between checks
    this.maxRetries = 3;
  }

  /**
   * Add verification request to queue
   */
  async addToQueue(engagementId, userId, username, tweetId, requiredActions) {
    const request = {
      engagementId,
      userId,
      username,
      tweetId,
      requiredActions,
      attempts: 0,
      addedAt: Date.now(),
    };

    this.queue.push(request);

    logger.info(`Added to verification queue: user ${userId}, tweet ${tweetId}`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return request;
  }

  /**
   * Process verification queue
   */
  async processQueue() {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();

      try {
        logger.info(`Processing verification: user ${request.userId}, tweet ${request.tweetId}`);

        // Call Python scraper service
        const results = await this.verifyEngagement(
          request.username,
          request.tweetId,
          request.requiredActions
        );

        // Return results
        request.results = results;
        request.status = 'completed';
        request.completedAt = Date.now();

        logger.info(`Verification completed: user ${request.userId}, results: ${JSON.stringify(results)}`);

      } catch (error) {
        logger.error(`Verification failed for user ${request.userId}:`, error);

        request.attempts++;

        // Retry if under max attempts
        if (request.attempts < this.maxRetries) {
          logger.info(`Retrying verification (attempt ${request.attempts}/${this.maxRetries})`);
          this.queue.push(request);
        } else {
          request.status = 'failed';
          request.error = error.message;
          logger.error(`Verification failed after ${this.maxRetries} attempts`);
        }
      }

      // Rate limiting delay
      await this.sleep(this.rateLimitDelay);
    }

    this.processing = false;
  }

  /**
   * Verify engagement via Python scraper
   */
  async verifyEngagement(username, tweetId, requiredActions) {
    try {
      const response = await axios.post(
        `${settings.scraper.apiUrl}/api/verify-engagement`,
        {
          username: username.replace('@', ''),
          tweet_id: tweetId,
          actions: requiredActions,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': settings.scraper.apiKey,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      if (response.data) {
        return {
          liked: response.data.liked || false,
          retweeted: response.data.retweeted || false,
          commented: response.data.commented || false,
          bookmarked: response.data.bookmarked || false,
          all_completed: response.data.all_completed || false,
        };
      }

      throw new Error('Invalid response from scraper service');
    } catch (error) {
      if (error.response) {
        logger.error(`Scraper API error: ${error.response.status} - ${error.response.data}`);
        throw new Error(`Scraper service returned error: ${error.response.status}`);
      } else if (error.request) {
        logger.error('Scraper service not reachable');
        throw new Error('Scraper service is not reachable. Please try again later.');
      } else {
        logger.error('Error calling scraper:', error.message);
        throw error;
      }
    }
  }

  /**
   * Check scraper service health
   */
  async checkScraperHealth() {
    try {
      const response = await axios.get(
        `${settings.scraper.apiUrl}/health`,
        { timeout: 5000 }
      );

      return response.status === 200;
    } catch (error) {
      logger.error('Scraper health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      oldestRequest: this.queue.length > 0 ? this.queue[0].addedAt : null,
    };
  }

  /**
   * Clear queue
   */
  clearQueue() {
    this.queue = [];
    logger.info('Verification queue cleared');
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
const verificationQueue = new VerificationQueue();

export default verificationQueue;