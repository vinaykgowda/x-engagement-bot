const db = require('../../database/queries');
const logger = require('../../config/logger');

class FrequencyChecker {
  constructor() {
    // Store last post times in memory for quick access
    // Format: `${userId}_${guildId}` -> timestamp
    this.lastPostTimes = new Map();

    // Default settings (can be overridden per guild)
    this.defaultSettings = {
      minIntervalMinutes: 60, // Minimum time between posts in minutes
      maxPostsPerDay: 10,     // Maximum posts per day
      maxPostsPerWeek: 50     // Maximum posts per week
    };
  }

  /**
   * Check if user can post based on frequency limits
   */
  async checkUserFrequency(userId, guildId) {
    try {
      // Get guild-specific frequency settings
      const settings = await this.getFrequencySettings(guildId);

      // Check minimum interval between posts
      const intervalCheck = await this.checkMinInterval(userId, guildId, settings.minIntervalMinutes);
      if (!intervalCheck.allowed) {
        return intervalCheck;
      }

      // Check daily limit
      const dailyCheck = await this.checkDailyLimit(userId, guildId, settings.maxPostsPerDay);
      if (!dailyCheck.allowed) {
        return dailyCheck;
      }

      // Check weekly limit
      const weeklyCheck = await this.checkWeeklyLimit(userId, guildId, settings.maxPostsPerWeek);
      if (!weeklyCheck.allowed) {
        return weeklyCheck;
      }

      return {
        allowed: true
      };

    } catch (error) {
      logger.error('Error checking user frequency:', error);
      // On error, allow the post (fail open)
      return {
        allowed: true
      };
    }
  }

  /**
   * Check minimum interval between posts
   */
  async checkMinInterval(userId, guildId, minIntervalMinutes) {
    const key = `${userId}_${guildId}`;
    const lastPostTime = this.lastPostTimes.get(key);

    if (!lastPostTime) {
      // First post, always allowed
      return { allowed: true };
    }

    const now = Date.now();
    const timeSinceLastPost = now - lastPostTime;
    const minInterval = minIntervalMinutes * 60 * 1000; // Convert to milliseconds

    if (timeSinceLastPost < minInterval) {
      const timeRemaining = minInterval - timeSinceLastPost;
      return {
        allowed: false,
        reason: 'minimum_interval',
        timeRemaining: this.formatTimeRemaining(timeRemaining),
        timeRemainingMs: timeRemaining
      };
    }

    return { allowed: true };
  }

  /**
   * Check daily post limit
   */
  async checkDailyLimit(userId, guildId, maxPostsPerDay) {
    try {
      const count = await db.getUserRaidCount(userId, guildId, '24h');

      if (count >= maxPostsPerDay) {
        return {
          allowed: false,
          reason: 'daily_limit',
          message: `You've reached the daily limit of ${maxPostsPerDay} raid posts. Try again tomorrow.`,
          currentCount: count,
          limit: maxPostsPerDay
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking daily limit:', error);
      return { allowed: true };
    }
  }

  /**
   * Check weekly post limit
   */
  async checkWeeklyLimit(userId, guildId, maxPostsPerWeek) {
    try {
      const count = await db.getUserRaidCount(userId, guildId, '7d');

      if (count >= maxPostsPerWeek) {
        return {
          allowed: false,
          reason: 'weekly_limit',
          message: `You've reached the weekly limit of ${maxPostsPerWeek} raid posts. Try again next week.`,
          currentCount: count,
          limit: maxPostsPerWeek
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking weekly limit:', error);
      return { allowed: true };
    }
  }

  /**
   * Update user's last post time
   */
  async updateLastPostTime(userId, guildId) {
    const key = `${userId}_${guildId}`;
    const now = Date.now();
    this.lastPostTimes.set(key, now);

    // Also update in database for persistence
    try {
      await db.updateUserLastRaidPost(userId, guildId, now);
    } catch (error) {
      logger.error('Error updating last post time in database:', error);
    }
  }

  /**
   * Get frequency settings for a guild
   */
  async getFrequencySettings(guildId) {
    try {
      const settings = await db.getGuildSettings(guildId);

      return {
        minIntervalMinutes: settings?.tweet_interval_minutes || this.defaultSettings.minIntervalMinutes,
        maxPostsPerDay: settings?.max_posts_per_day || this.defaultSettings.maxPostsPerDay,
        maxPostsPerWeek: settings?.max_posts_per_week || this.defaultSettings.maxPostsPerWeek
      };
    } catch (error) {
      logger.error('Error getting frequency settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Format time remaining in a human-readable format
   */
  formatTimeRemaining(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${seconds}s`;
  }

  /**
   * Get user's raid statistics
   */
  async getUserStats(userId, guildId) {
    try {
      const [dailyCount, weeklyCount, totalCount] = await Promise.all([
        db.getUserRaidCount(userId, guildId, '24h'),
        db.getUserRaidCount(userId, guildId, '7d'),
        db.getUserRaidCount(userId, guildId, 'all')
      ]);

      const settings = await this.getFrequencySettings(guildId);
      const key = `${userId}_${guildId}`;
      const lastPostTime = this.lastPostTimes.get(key);

      return {
        daily: {
          count: dailyCount,
          limit: settings.maxPostsPerDay,
          remaining: Math.max(0, settings.maxPostsPerDay - dailyCount)
        },
        weekly: {
          count: weeklyCount,
          limit: settings.maxPostsPerWeek,
          remaining: Math.max(0, settings.maxPostsPerWeek - weeklyCount)
        },
        total: totalCount,
        lastPostTime: lastPostTime || null,
        canPostNow: (await this.checkUserFrequency(userId, guildId)).allowed
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Reset frequency tracking (for testing or admin purposes)
   */
  resetUserFrequency(userId, guildId) {
    const key = `${userId}_${guildId}`;
    this.lastPostTimes.delete(key);
    logger.info(`Reset frequency tracking for user ${userId} in guild ${guildId}`);
  }

  /**
   * Load last post times from database on startup
   */
  async initializeFromDatabase(guildId) {
    try {
      const lastPosts = await db.getRecentRaidPosts(guildId, 1000);

      for (const post of lastPosts) {
        const key = `${post.user_id}_${post.guild_id}`;
        const timestamp = new Date(post.created_at).getTime();

        // Only store if it's within the last 24 hours (relevant for min interval)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          this.lastPostTimes.set(key, timestamp);
        }
      }

      logger.info(`Initialized frequency checker with ${lastPosts.length} recent posts`);
    } catch (error) {
      logger.error('Error initializing from database:', error);
    }
  }

  /**
   * Clean up old entries from memory (run periodically)
   */
  cleanupOldEntries() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    let removed = 0;
    for (const [key, timestamp] of this.lastPostTimes.entries()) {
      if (now - timestamp > maxAge) {
        this.lastPostTimes.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`Cleaned up ${removed} old frequency entries`);
    }
  }
}

module.exports = new FrequencyChecker();