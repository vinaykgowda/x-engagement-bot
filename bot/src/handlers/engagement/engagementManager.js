// ============================================================================
// FILE 1: bot/src/handlers/engagement/engagementManager.js
// ============================================================================

import { engagementQueries, pointsQueries, globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

class EngagementManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new engagement campaign
   */
  createEngagement(guildId, tweetId, tweetUrl, requirements, pointsReward, createdBy, expiresAt = null) {
    try {
      const result = engagementQueries.createEngagement(
        this.db,
        guildId,
        tweetId,
        tweetUrl,
        requirements,
        pointsReward,
        createdBy,
        expiresAt
      );

      logger.engagement('created', {
        guildId,
        tweetId,
        pointsReward,
        requirements,
        expiresAt,
      });

      return result;
    } catch (error) {
      logger.error('Error creating engagement:', error);
      throw error;
    }
  }

  /**
   * Get engagement by ID
   */
  getEngagement(engagementId) {
    return engagementQueries.getEngagement(this.db, engagementId);
  }

  /**
   * Get engagement by tweet ID
   */
  getEngagementByTweetId(guildId, tweetId) {
    return engagementQueries.getEngagementByTweetId(this.db, guildId, tweetId);
  }

  /**
   * Get all active engagements for a guild
   */
  getActiveEngagements(guildId) {
    return engagementQueries.getActiveEngagements(this.db, guildId);
  }

  /**
   * Record a user's attempt at an engagement
   */
  async recordUserEngagement(engagementId, userId, guildId) {
    try {
      // Ensure user exists in global_users
      globalUserQueries.upsertUser(
        this.db,
        userId,
        'Unknown', // Will be updated when they interact
        ''
      );

      // Check if user already attempted this engagement
      const existing = engagementQueries.getUserEngagement(
        this.db,
        engagementId,
        userId
      );

      if (existing) {
        return { alreadyAttempted: true, engagement: existing };
      }

      // Record new attempt
      engagementQueries.recordUserEngagement(
        this.db,
        engagementId,
        userId,
        guildId
      );

      logger.engagement('attempt_recorded', {
        engagementId,
        userId,
        guildId,
      });

      return { alreadyAttempted: false };
    } catch (error) {
      logger.error('Error recording user engagement:', error);
      throw error;
    }
  }

  /**
   * Update user engagement with verification results
   */
  async updateUserEngagement(engagementId, userId, verificationResults) {
    try {
      // Update engagement status
      engagementQueries.updateUserEngagement(
        this.db,
        engagementId,
        userId,
        verificationResults
      );

      // Check if all requirements are met
      const engagement = this.getEngagement(engagementId);
      const userEngagement = engagementQueries.getUserEngagement(
        this.db,
        engagementId,
        userId
      );

      const allCompleted = this.checkAllRequirementsMet(engagement, userEngagement);

      if (allCompleted && !userEngagement.points_awarded) {
        // Award points
        await this.awardPoints(engagement, userId);

        // Update total completions
        this.db.prepare(`
          UPDATE server_engagements
          SET total_completions = total_completions + 1
          WHERE id = ?
        `).run(engagementId);

        // Mark points as awarded
        this.db.prepare(`
          UPDATE server_user_engagements
          SET points_awarded = ?
          WHERE engagement_id = ? AND user_id = ?
        `).run(engagement.points_reward, engagementId, userId);

        logger.engagement('completed', {
          engagementId,
          userId,
          pointsAwarded: engagement.points_reward,
        });
      }

      return {
        completed: allCompleted,
        pointsAwarded: allCompleted ? engagement.points_reward : 0,
        verificationResults,
      };
    } catch (error) {
      logger.error('Error updating user engagement:', error);
      throw error;
    }
  }

  /**
   * Check if user has met all requirements
   */
  checkAllRequirementsMet(engagement, userEngagement) {
    const requirements = {
      like: engagement.require_like === 1,
      retweet: engagement.require_retweet === 1,
      comment: engagement.require_comment === 1,
      bookmark: engagement.require_bookmark === 1,
    };

    const completions = {
      like: userEngagement.liked === 1,
      retweet: userEngagement.retweeted === 1,
      comment: userEngagement.commented === 1,
      bookmark: userEngagement.bookmarked === 1,
    };

    // Check each required action
    for (const [action, required] of Object.entries(requirements)) {
      if (required && !completions[action]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Award points to user
   */
  async awardPoints(engagement, userId) {
    try {
      pointsQueries.addPoints(
        this.db,
        userId,
        engagement.guild_id,
        engagement.points_reward
      );

      logger.reward('points_awarded', userId, engagement.points_reward, 'points');
    } catch (error) {
      logger.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Get user's engagement status
   */
  getUserEngagementStatus(engagementId, userId) {
    return engagementQueries.getUserEngagement(this.db, engagementId, userId);
  }

  /**
   * Get engagement statistics
   */
  getEngagementStats(engagementId) {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_attempts,
        SUM(completed) as completions,
        SUM(liked) as likes,
        SUM(retweeted) as retweets,
        SUM(commented) as comments,
        SUM(bookmarked) as bookmarks,
        SUM(points_awarded) as total_points_awarded
      FROM server_user_engagements
      WHERE engagement_id = ?
    `).get(engagementId);

    return stats;
  }

  /**
   * Deactivate engagement
   */
  deactivateEngagement(engagementId) {
    try {
      this.db.prepare(`
        UPDATE server_engagements
        SET is_active = 0
        WHERE id = ?
      `).run(engagementId);

      logger.engagement('deactivated', { engagementId });
    } catch (error) {
      logger.error('Error deactivating engagement:', error);
      throw error;
    }
  }

  /**
   * Update engagement expiration
   */
  updateExpiration(engagementId, expiresAt) {
    try {
      this.db.prepare(`
        UPDATE server_engagements
        SET expires_at = ?
        WHERE id = ?
      `).run(expiresAt, engagementId);

      logger.engagement('expiration_updated', { engagementId, expiresAt });
    } catch (error) {
      logger.error('Error updating expiration:', error);
      throw error;
    }
  }

  /**
   * Get required actions for an engagement
   */
  getRequiredActions(engagement) {
    const actions = [];
    if (engagement.require_like) actions.push('like');
    if (engagement.require_retweet) actions.push('retweet');
    if (engagement.require_comment) actions.push('comment');
    if (engagement.require_bookmark) actions.push('bookmark');
    return actions;
  }

  /**
   * Check if user can participate
   */
  canUserParticipate(engagement, userId) {
    // Check if engagement is active
    if (!engagement.is_active) {
      return { canParticipate: false, reason: 'Engagement is no longer active' };
    }

    // Check if expired
    if (engagement.expires_at && engagement.expires_at < Date.now()) {
      return { canParticipate: false, reason: 'Engagement has expired' };
    }

    // Check if user already completed
    const userEngagement = this.getUserEngagementStatus(engagement.id, userId);
    if (userEngagement && userEngagement.completed) {
      return { canParticipate: false, reason: 'You already completed this engagement' };
    }

    return { canParticipate: true };
  }
}

export default EngagementManager;