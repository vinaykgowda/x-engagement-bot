import db from '../../database/queries.js';
import logger from '../../config/logger.js';

class AutoReward {
  constructor() {
    // Default reward configuration
    this.defaultConfig = {
      baseReward: 10,           // Base points for valid submission
      likesMultiplier: 1,       // Points per like
      retweetsMultiplier: 5,    // Points per retweet
      repliesMultiplier: 3,     // Points per reply
      quotesMultiplier: 5,      // Points per quote tweet
      bookmarksMultiplier: 2,   // Points per bookmark
      viewsMultiplier: 0.01,    // Points per view (scaled down)

      // Bonus thresholds
      bonuses: [
        { threshold: 100, type: 'likes', bonus: 50, name: 'Viral Engagement' },
        { threshold: 50, type: 'retweets', bonus: 100, name: 'Mega Spread' },
        { threshold: 1000, type: 'views', bonus: 25, name: 'High Visibility' },
        { threshold: 10000, type: 'views', bonus: 100, name: 'Viral Views' }
      ],

      // Maximum points per submission
      maxPointsPerSubmission: 1000,

      // Minimum engagement for rewards
      minEngagement: {
        likes: 0,
        retweets: 0,
        replies: 0
      }
    };
  }

  /**
   * Process reward for a raid submission
   */
  async processReward(userId, guildId, engagementData, username) {
    try {
      // Get guild-specific reward configuration
      const config = await this.getRewardConfig(guildId);

      // Calculate points based on engagement
      const points = this.calculatePoints(engagementData, config);

      // Check if minimum engagement requirements are met
      if (!this.meetsMinimumEngagement(engagementData, config)) {
        logger.info(`User ${userId} does not meet minimum engagement requirements`);
        return {
          rewarded: false,
          points: 0,
          reason: 'Minimum engagement requirements not met'
        };
      }

      // Award points to user
      await db.addUserPoints(userId, guildId, points);

      // Record the reward transaction
      await db.recordRewardTransaction(userId, guildId, {
        points,
        type: 'raid_reward',
        engagement: engagementData,
        username
      });

      logger.info(`Awarded ${points} points to user ${userId} for raid submission`);

      return {
        rewarded: true,
        points,
        breakdown: this.getPointsBreakdown(engagementData, config),
        bonuses: this.getAppliedBonuses(engagementData, config)
      };

    } catch (error) {
      logger.error('Error processing reward:', error);
      return {
        rewarded: false,
        points: 0,
        reason: 'Error processing reward',
        error: error.message
      };
    }
  }

  /**
   * Calculate points based on engagement metrics
   */
  calculatePoints(engagement, config) {
    let points = config.baseReward;

    // Add points for each engagement type
    points += (engagement.likes || 0) * config.likesMultiplier;
    points += (engagement.retweets || 0) * config.retweetsMultiplier;
    points += (engagement.replies || 0) * config.repliesMultiplier;
    points += (engagement.quotes || 0) * config.quotesMultiplier;
    points += (engagement.bookmarks || 0) * config.bookmarksMultiplier;
    points += Math.floor((engagement.views || 0) * config.viewsMultiplier);

    // Apply bonuses
    for (const bonus of config.bonuses) {
      const metricValue = engagement[bonus.type] || 0;
      if (metricValue >= bonus.threshold) {
        points += bonus.bonus;
        logger.info(`Bonus applied: ${bonus.name} (+${bonus.bonus} points)`);
      }
    }

    // Cap at maximum points
    points = Math.min(points, config.maxPointsPerSubmission);

    // Ensure minimum of 0
    points = Math.max(0, Math.floor(points));

    return points;
  }

  /**
   * Check if engagement meets minimum requirements
   */
  meetsMinimumEngagement(engagement, config) {
    if (!config.minEngagement) {
      return true;
    }

    const meetsLikes = (engagement.likes || 0) >= config.minEngagement.likes;
    const meetsRetweets = (engagement.retweets || 0) >= config.minEngagement.retweets;
    const meetsReplies = (engagement.replies || 0) >= config.minEngagement.replies;

    return meetsLikes && meetsRetweets && meetsReplies;
  }

  /**
   * Get detailed breakdown of points calculation
   */
  getPointsBreakdown(engagement, config) {
    return {
      base: config.baseReward,
      likes: (engagement.likes || 0) * config.likesMultiplier,
      retweets: (engagement.retweets || 0) * config.retweetsMultiplier,
      replies: (engagement.replies || 0) * config.repliesMultiplier,
      quotes: (engagement.quotes || 0) * config.quotesMultiplier,
      bookmarks: (engagement.bookmarks || 0) * config.bookmarksMultiplier,
      views: Math.floor((engagement.views || 0) * config.viewsMultiplier)
    };
  }

  /**
   * Get list of bonuses that were applied
   */
  getAppliedBonuses(engagement, config) {
    const applied = [];

    for (const bonus of config.bonuses) {
      const metricValue = engagement[bonus.type] || 0;
      if (metricValue >= bonus.threshold) {
        applied.push({
          name: bonus.name,
          bonus: bonus.bonus,
          threshold: bonus.threshold,
          actualValue: metricValue
        });
      }
    }

    return applied;
  }

  /**
   * Get reward configuration for a guild
   */
  async getRewardConfig(guildId) {
    try {
      const settings = await db.getGuildSettings(guildId);

      if (!settings || !settings.reward_config) {
        return this.defaultConfig;
      }

      // Merge guild config with defaults
      return {
        ...this.defaultConfig,
        ...settings.reward_config
      };
    } catch (error) {
      logger.error('Error getting reward config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Update reward configuration for a guild
   */
  async updateRewardConfig(guildId, newConfig) {
    try {
      const currentConfig = await this.getRewardConfig(guildId);
      const updatedConfig = {
        ...currentConfig,
        ...newConfig
      };

      await db.updateGuildSettings(guildId, {
        reward_config: updatedConfig
      });

      logger.info(`Updated reward config for guild ${guildId}`);
      return {
        success: true,
        config: updatedConfig
      };
    } catch (error) {
      logger.error('Error updating reward config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate potential rewards (preview mode)
   */
  calculatePotentialReward(engagement, config = null) {
    const usedConfig = config || this.defaultConfig;

    return {
      points: this.calculatePoints(engagement, usedConfig),
      breakdown: this.getPointsBreakdown(engagement, usedConfig),
      bonuses: this.getAppliedBonuses(engagement, usedConfig),
      meetsMinimum: this.meetsMinimumEngagement(engagement, usedConfig)
    };
  }

  /**
   * Recalculate rewards for a submission (admin function)
   */
  async recalculateReward(submissionId, guildId) {
    try {
      const submission = await db.getRaidSubmission(submissionId);

      if (!submission) {
        return {
          success: false,
          error: 'Submission not found'
        };
      }

      const config = await this.getRewardConfig(guildId);
      const newPoints = this.calculatePoints(submission.engagement_data, config);
      const oldPoints = submission.points_awarded;
      const pointsDiff = newPoints - oldPoints;

      // Update user's points
      await db.addUserPoints(submission.user_id, guildId, pointsDiff);

      // Update submission record
      await db.updateRaidSubmission(submissionId, {
        points_awarded: newPoints,
        recalculated_at: new Date()
      });

      logger.info(`Recalculated reward for submission ${submissionId}: ${oldPoints} -> ${newPoints}`);

      return {
        success: true,
        oldPoints,
        newPoints,
        difference: pointsDiff
      };
    } catch (error) {
      logger.error('Error recalculating reward:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get reward statistics for a guild
   */
  async getRewardStats(guildId, timeframe = '7d') {
    try {
      const stats = await db.getRewardStats(guildId, timeframe);

      return {
        success: true,
        data: {
          totalPointsAwarded: stats.total_points || 0,
          totalSubmissions: stats.total_submissions || 0,
          averagePointsPerSubmission: stats.avg_points || 0,
          topUsers: stats.top_users || [],
          rewardDistribution: stats.distribution || {}
        }
      };
    } catch (error) {
      logger.error('Error getting reward stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch process rewards for multiple submissions
   */
  async batchProcessRewards(submissions, guildId) {
    const results = [];

    for (const submission of submissions) {
      try {
        const result = await this.processReward(
          submission.userId,
          guildId,
          submission.engagementData,
          submission.username
        );

        results.push({
          submissionId: submission.id,
          success: true,
          ...result
        });
      } catch (error) {
        logger.error(`Error processing reward for submission ${submission.id}:`, error);
        results.push({
          submissionId: submission.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get leaderboard based on rewards
   */
  async getRewardLeaderboard(guildId, limit = 10, timeframe = '30d') {
    try {
      const leaderboard = await db.getRewardLeaderboard(guildId, limit, timeframe);

      return {
        success: true,
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          userId: entry.user_id,
          username: entry.username,
          totalPoints: entry.total_points,
          totalSubmissions: entry.submission_count,
          averagePoints: Math.floor(entry.total_points / entry.submission_count)
        }))
      };
    } catch (error) {
      logger.error('Error getting reward leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AutoReward();