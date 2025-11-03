// ============================================================================
// FILE 3: bot/src/handlers/engagement/expirationChecker.js
// ============================================================================

import logger from '../../config/logger.js';

class ExpirationChecker {
  constructor(db) {
    this.db = db;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
  }

  /**
   * Start automatic expiration checking
   */
  start() {
    if (this.intervalId) {
      logger.warn('Expiration checker already running');
      return;
    }

    logger.info('Starting expiration checker...');

    // Run immediately
    this.checkExpiredEngagements();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.checkExpiredEngagements();
    }, this.checkInterval);

    logger.info(`Expiration checker started (checking every ${this.checkInterval / 1000 / 60} minutes)`);
  }

  /**
   * Stop automatic expiration checking
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Expiration checker stopped');
    }
  }

  /**
   * Check and expire old engagements
   */
  checkExpiredEngagements() {
    try {
      const now = Date.now();

      // Get expired engagements that are still active
      const expiredEngagements = this.db.prepare(`
        SELECT * FROM server_engagements
        WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < ?
      `).all(now);

      if (expiredEngagements.length === 0) {
        logger.debug('No expired engagements found');
        return { expired: 0 };
      }

      // Deactivate expired engagements
      const result = this.db.prepare(`
        UPDATE server_engagements
        SET is_active = 0
        WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < ?
      `).run(now);

      logger.info(`⏰ Expired ${result.changes} engagement campaign(s)`);

      // Log each expired engagement
      expiredEngagements.forEach((engagement) => {
        logger.engagement('expired', {
          engagementId: engagement.id,
          guildId: engagement.guild_id,
          tweetId: engagement.tweet_id,
          completions: engagement.total_completions,
        });
      });

      return {
        expired: result.changes,
        engagements: expiredEngagements,
      };
    } catch (error) {
      logger.error('Error checking expired engagements:', error);
      return { expired: 0, error: error.message };
    }
  }

  /**
   * Get engagements expiring soon
   */
  getExpiringSoon(hours = 24) {
    try {
      const now = Date.now();
      const threshold = now + (hours * 60 * 60 * 1000);

      const expiring = this.db.prepare(`
        SELECT * FROM server_engagements
        WHERE is_active = 1
          AND expires_at IS NOT NULL
          AND expires_at > ?
          AND expires_at < ?
        ORDER BY expires_at ASC
      `).all(now, threshold);

      return expiring;
    } catch (error) {
      logger.error('Error getting expiring engagements:', error);
      return [];
    }
  }

  /**
   * Get engagement time remaining
   */
  getTimeRemaining(expiresAt) {
    if (!expiresAt) return null;

    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining < 0) return { expired: true };

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      expired: false,
      hours,
      minutes,
      totalMinutes: Math.floor(remaining / (1000 * 60)),
      formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    };
  }

  /**
   * Extend engagement expiration
   */
  extendExpiration(engagementId, additionalHours) {
    try {
      const engagement = this.db.prepare(
        'SELECT * FROM server_engagements WHERE id = ?'
      ).get(engagementId);

      if (!engagement) {
        throw new Error('Engagement not found');
      }

      const currentExpiration = engagement.expires_at || Date.now();
      const newExpiration = currentExpiration + (additionalHours * 60 * 60 * 1000);

      this.db.prepare(`
        UPDATE server_engagements
        SET expires_at = ?
        WHERE id = ?
      `).run(newExpiration, engagementId);

      logger.engagement('expiration_extended', {
        engagementId,
        additionalHours,
        newExpiration,
      });

      return { success: true, newExpiration };
    } catch (error) {
      logger.error('Error extending expiration:', error);
      throw error;
    }
  }

  /**
   * Remove expiration from engagement
   */
  removeExpiration(engagementId) {
    try {
      this.db.prepare(`
        UPDATE server_engagements
        SET expires_at = NULL
        WHERE id = ?
      `).run(engagementId);

      logger.engagement('expiration_removed', { engagementId });

      return { success: true };
    } catch (error) {
      logger.error('Error removing expiration:', error);
      throw error;
    }
  }

  /**
   * Get expiration statistics
   */
  getExpirationStats() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_active,
          SUM(CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END) as no_expiration,
          SUM(CASE WHEN expires_at IS NOT NULL AND expires_at > ? THEN 1 ELSE 0 END) as with_expiration,
          SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < ? THEN 1 ELSE 0 END) as expired_but_active
        FROM server_engagements
        WHERE is_active = 1
      `).get(Date.now(), Date.now());

      return stats;
    } catch (error) {
      logger.error('Error getting expiration stats:', error);
      return null;
    }
  }

  /**
   * Manual check (can be called from command)
   */
  manualCheck() {
    logger.info('Manual expiration check triggered');
    return this.checkExpiredEngagements();
  }
}

export default ExpirationChecker;