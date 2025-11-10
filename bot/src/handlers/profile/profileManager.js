import crypto from 'crypto';
import { connection, globalUserQueries, twitterQueries } from '../../database/queries.js';
import duplicateChecker from './duplicateChecker.js';
import profileValidator from './profileValidator.js';
import logger from '../../config/logger.js';

class ProfileManager {
  constructor() {
    // Store pending verifications: userId -> { code, twitterUsername, twitterUrl, expiresAt }
    this.pendingVerifications = new Map();
    
    // Verification code settings
    this.codeLength = 8;
    this.codeExpiryMinutes = 15;
  }

  /**
   * Create or update a global user profile
   */
  async createOrUpdateUser(userId, username, discriminator) {
    try {
      const result = globalUserQueries.upsertUser(
        connection,
        userId,
        username,
        discriminator
      );

      logger.info(`User profile created/updated: ${userId} (${username})`);

      return {
        success: true,
        userId,
        username
      };
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user profile with Twitter info
   */
  async getUserProfile(userId) {
    try {
      const profile = globalUserQueries.getUserWithTwitter(connection, userId);

      if (!profile) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        profile: {
          userId: profile.user_id,
          username: profile.username,
          discriminator: profile.discriminator,
          twitterUsername: profile.twitter_username,
          twitterUrl: profile.twitter_url,
          twitterVerified: profile.twitter_verified === 1,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 1: Initiate Twitter profile linking
   * Generate verification code and save it
   */
  async initiateTwitterLink(userId, twitterInput) {
    try {
      // Validate Twitter URL/username format
      const validation = profileValidator.validateTwitterInput(twitterInput);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const { twitterUsername, twitterUrl } = validation;

      // Check for duplicates
      const duplicateCheck = await duplicateChecker.checkForDuplicates(
        userId,
        twitterUsername
      );

      if (!duplicateCheck.allowed) {
        return {
          success: false,
          error: duplicateCheck.error,
          duplicateInfo: duplicateCheck.duplicateInfo
        };
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const expiresAt = Date.now() + (this.codeExpiryMinutes * 60 * 1000);

      // Store pending verification
      this.pendingVerifications.set(userId, {
        code: verificationCode,
        twitterUsername,
        twitterUrl,
        expiresAt
      });

      logger.info(`Verification initiated for user ${userId} -> @${twitterUsername}`);

      return {
        success: true,
        verificationCode,
        twitterUsername,
        twitterUrl,
        expiresAt,
        instructions: this.getVerificationInstructions(verificationCode, twitterUsername)
      };
    } catch (error) {
      logger.error('Error initiating Twitter link:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 2: Verify Twitter profile ownership
   * User must tweet the verification code
   */
  async verifyTwitterLink(userId, tweetUrl) {
    try {
      // Get pending verification
      const pending = this.pendingVerifications.get(userId);

      if (!pending) {
        return {
          success: false,
          error: 'No pending verification found. Please start the verification process again.'
        };
      }

      // Check if verification code expired
      if (Date.now() > pending.expiresAt) {
        this.pendingVerifications.delete(userId);
        return {
          success: false,
          error: 'Verification code expired. Please start the verification process again.'
        };
      }

      // Validate tweet URL format
      const tweetValidation = profileValidator.validateTweetUrl(tweetUrl);
      
      if (!tweetValidation.valid) {
        return {
          success: false,
          error: tweetValidation.error
        };
      }

      // Extract tweet ID from URL
      const tweetId = this.extractTweetId(tweetUrl);
      
      if (!tweetId) {
        return {
          success: false,
          error: 'Invalid tweet URL format'
        };
      }

      // TODO: Call Python scraper API to verify the tweet
      // For now, we'll simulate the verification
      const verificationResult = await this.verifyTweetContent(
        tweetUrl,
        pending.twitterUsername,
        pending.code
      );

      if (!verificationResult.valid) {
        return {
          success: false,
          error: verificationResult.error
        };
      }

      // Verification successful - link the profile
      const linkResult = await this.linkTwitterProfile(
        userId,
        pending.twitterUsername,
        pending.twitterUrl
      );

      if (!linkResult.success) {
        return linkResult;
      }

      // Clean up pending verification
      this.pendingVerifications.delete(userId);

      logger.info(`Twitter profile verified and linked: ${userId} -> @${pending.twitterUsername}`);

      return {
        success: true,
        message: 'Twitter profile successfully verified and linked!',
        twitterUsername: pending.twitterUsername,
        verified: true
      };
    } catch (error) {
      logger.error('Error verifying Twitter link:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Link Twitter profile to user (internal method)
   */
  async linkTwitterProfile(userId, twitterUsername, twitterUrl) {
    try {
      // Final duplicate check before linking
      const duplicateCheck = await duplicateChecker.checkForDuplicates(
        userId,
        twitterUsername
      );

      if (!duplicateCheck.allowed) {
        return {
          success: false,
          error: duplicateCheck.error
        };
      }

      // Set Twitter profile in database
      twitterQueries.setProfile(
        connection,
        userId,
        twitterUsername,
        twitterUrl
      );

      // Mark as verified
      await this.markProfileAsVerified(userId);

      return {
        success: true,
        twitterUsername,
        verified: true
      };
    } catch (error) {
      logger.error('Error linking Twitter profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unlink Twitter profile
   */
  async unlinkTwitterProfile(userId) {
    try {
      // Check if user has a linked profile
      const profile = twitterQueries.getProfile(connection, userId);

      if (!profile) {
        return {
          success: false,
          error: 'No Twitter profile linked'
        };
      }

      // Delete the Twitter profile
      connection.prepare('DELETE FROM global_twitter_profiles WHERE user_id = ?').run(userId);

      logger.info(`Twitter profile unlinked: ${userId} (was @${profile.twitter_username})`);

      return {
        success: true,
        message: 'Twitter profile unlinked successfully',
        previousUsername: profile.twitter_username
      };
    } catch (error) {
      logger.error('Error unlinking Twitter profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update Twitter profile
   */
  async updateTwitterProfile(userId, newTwitterInput) {
    try {
      // Unlink old profile
      await this.unlinkTwitterProfile(userId);

      // Initiate new verification
      return await this.initiateTwitterLink(userId, newTwitterInput);
    } catch (error) {
      logger.error('Error updating Twitter profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark profile as verified
   */
  async markProfileAsVerified(userId) {
    try {
      connection.prepare(`
        UPDATE global_twitter_profiles
        SET verified = 1, updated_at = ?
        WHERE user_id = ?
      `).run(Date.now(), userId);

      return true;
    } catch (error) {
      logger.error('Error marking profile as verified:', error);
      return false;
    }
  }

  /**
   * Generate random verification code
   */
  generateVerificationCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < this.codeLength; i++) {
      const randomIndex = crypto.randomInt(0, characters.length);
      code += characters[randomIndex];
    }

    return code;
  }

  /**
   * Get verification instructions
   */
  getVerificationInstructions(code, twitterUsername) {
    return {
      step1: `Post a tweet from @${twitterUsername} containing your verification code`,
      step2: `Your verification code: ${code}`,
      step3: `Tweet format: "Verifying my Discord account: ${code}"`,
      step4: `Copy the tweet URL and use the verify command`,
      expiresIn: `${this.codeExpiryMinutes} minutes`
    };
  }

  /**
   * Verify tweet content (will integrate with Python scraper)
   */
  async verifyTweetContent(tweetUrl, expectedUsername, expectedCode) {
    try {
      // TODO: Replace with actual API call to Python scraper
      // For now, returning a mock response
      
      // This should:
      // 1. Fetch tweet content from scraper API
      // 2. Check if tweet author matches expectedUsername
      // 3. Check if tweet contains the verification code
      // 4. Check if tweet is recent (within expiry time)

      // Mock implementation:
      return {
        valid: true, // In production, check actual tweet content
        author: expectedUsername,
        content: `Verifying my Discord account: ${expectedCode}`,
        timestamp: Date.now()
      };

      /*
      // Production implementation:
      import axios from 'axios';
      const scraperApiUrl = process.env.SCRAPER_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(`${scraperApiUrl}/api/verify-tweet`, {
        tweet_url: tweetUrl,
        expected_username: expectedUsername,
        expected_code: expectedCode
      });

      return {
        valid: response.data.valid,
        author: response.data.author,
        content: response.data.content,
        timestamp: response.data.timestamp,
        error: response.data.error
      };
      */
    } catch (error) {
      logger.error('Error verifying tweet content:', error);
      return {
        valid: false,
        error: 'Failed to verify tweet. Please try again.'
      };
    }
  }

  /**
   * Extract tweet ID from URL
   */
  extractTweetId(tweetUrl) {
    const tweetRegex = /https?:\/\/(twitter\.com|x\.com)\/[^\/\s]+\/status\/(\d+)/i;
    const match = tweetUrl.match(tweetRegex);
    return match ? match[2] : null;
  }

  /**
   * Get pending verification status
   */
  getPendingVerification(userId) {
    const pending = this.pendingVerifications.get(userId);
    
    if (!pending) {
      return null;
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingVerifications.delete(userId);
      return null;
    }

    return {
      code: pending.code,
      twitterUsername: pending.twitterUsername,
      expiresAt: pending.expiresAt,
      timeRemaining: this.formatTimeRemaining(pending.expiresAt - Date.now())
    };
  }

  /**
   * Cancel pending verification
   */
  cancelPendingVerification(userId) {
    const deleted = this.pendingVerifications.delete(userId);
    
    if (deleted) {
      logger.info(`Verification cancelled for user ${userId}`);
    }

    return deleted;
  }

  /**
   * Format time remaining
   */
  formatTimeRemaining(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Clean up expired verifications (call periodically)
   */
  cleanupExpiredVerifications() {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, pending] of this.pendingVerifications.entries()) {
      if (now > pending.expiresAt) {
        this.pendingVerifications.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired verifications`);
    }

    return cleaned;
  }

  /**
   * Get profile statistics
   */
  async getProfileStats() {
    try {
      const stats = {
        totalUsers: connection.prepare('SELECT COUNT(*) as count FROM global_users').get().count,
        linkedProfiles: connection.prepare('SELECT COUNT(*) as count FROM global_twitter_profiles').get().count,
        verifiedProfiles: connection.prepare('SELECT COUNT(*) as count FROM global_twitter_profiles WHERE verified = 1').get().count,
        pendingVerifications: this.pendingVerifications.size
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      logger.error('Error getting profile stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ProfileManager();
