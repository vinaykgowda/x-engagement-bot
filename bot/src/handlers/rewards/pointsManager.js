// ============================================================================
// FILE 1: bot/src/handlers/rewards/pointsManager.js
// ============================================================================

import { pointsQueries, globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

class PointsManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Add points to a user
   */
  addPoints(userId, guildId, points, reason = 'engagement') {
    try {
      // Ensure user exists
      globalUserQueries.upsertUser(this.db, userId, 'Unknown', '');

      // Add points
      pointsQueries.addPoints(this.db, userId, guildId, points);

      logger.reward('added', userId, points, 'points');
      logger.info(`Added ${points} points to user ${userId} in guild ${guildId} (${reason})`);

      return { success: true, points };
    } catch (error) {
      logger.error('Error adding points:', error);
      throw error;
    }
  }

  /**
   * Deduct points from a user
   */
  deductPoints(userId, guildId, points, reason = 'reward_claim') {
    try {
      const userPoints = this.getPoints(userId, guildId);

      if (!userPoints || userPoints.available_points < points) {
        throw new Error('Insufficient points');
      }

      // Deduct points
      pointsQueries.spendPoints(this.db, userId, guildId, points);

      logger.reward('deducted', userId, points, 'points');
      logger.info(`Deducted ${points} points from user ${userId} in guild ${guildId} (${reason})`);

      return {
        success: true,
        pointsSpent: points,
        remainingPoints: userPoints.available_points - points
      };
    } catch (error) {
      logger.error('Error deducting points:', error);
      throw error;
    }
  }

  /**
   * Get user points
   */
  getPoints(userId, guildId) {
    return pointsQueries.getPoints(this.db, userId, guildId);
  }

  /**
   * Get user rank
   */
  getUserRank(userId, guildId) {
    const rankData = pointsQueries.getUserRank(this.db, userId, guildId);
    return rankData?.rank || null;
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(guildId, limit = 10) {
    return pointsQueries.getLeaderboard(this.db, guildId, limit);
  }

  /**
   * Get user position on leaderboard
   */
  getLeaderboardPosition(userId, guildId) {
    const rank = this.getUserRank(userId, guildId);
    const points = this.getPoints(userId, guildId);

    if (!rank || !points) {
      return null;
    }

    return {
      rank,
      totalPoints: points.total_points,
      availablePoints: points.available_points,
    };
  }

  /**
   * Get guild points statistics
   */
  getGuildStats(guildId) {
    const stats = this.db.prepare(`
      SELECT
        COUNT(DISTINCT user_id) as total_users,
        SUM(total_points) as total_points_earned,
        SUM(available_points) as total_points_available,
        SUM(total_points - available_points) as total_points_spent,
        AVG(total_points) as avg_points_per_user,
        MAX(total_points) as highest_points
      FROM server_points
      WHERE guild_id = ?
    `).get(guildId);

    return stats;
  }

  /**
   * Transfer points between users (admin function)
   */
  transferPoints(fromUserId, toUserId, guildId, points, adminId) {
    try {
      // Check if sender has enough points
      const fromPoints = this.getPoints(fromUserId, guildId);
      if (!fromPoints || fromPoints.available_points < points) {
        throw new Error('Insufficient points to transfer');
      }

      // Deduct from sender
      this.deductPoints(fromUserId, guildId, points, 'transfer');

      // Add to receiver
      this.addPoints(toUserId, guildId, points, 'transfer_received');

      logger.info(`Transferred ${points} points from ${fromUserId} to ${toUserId} by admin ${adminId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error transferring points:', error);
      throw error;
    }
  }

  /**
   * Set user points (admin function)
   */
  setPoints(userId, guildId, totalPoints, availablePoints, adminId) {
    try {
      // Ensure user exists
      globalUserQueries.upsertUser(this.db, userId, 'Unknown', '');

      const now = Date.now();

      this.db.prepare(`
        INSERT INTO server_points (user_id, guild_id, total_points, available_points, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, guild_id) DO UPDATE SET
          total_points = excluded.total_points,
          available_points = excluded.available_points,
          updated_at = excluded.updated_at
      `).run(userId, guildId, totalPoints, availablePoints, now);

      logger.info(`Admin ${adminId} set points for ${userId}: total=${totalPoints}, available=${availablePoints}`);

      return { success: true };
    } catch (error) {
      logger.error('Error setting points:', error);
      throw error;
    }
  }

  /**
   * Reset user points (admin function)
   */
  resetPoints(userId, guildId, adminId) {
    try {
      this.db.prepare(`
        DELETE FROM server_points
        WHERE user_id = ? AND guild_id = ?
      `).run(userId, guildId);

      logger.info(`Admin ${adminId} reset points for user ${userId} in guild ${guildId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error resetting points:', error);
      throw error;
    }
  }

  /**
   * Get points history (transactions)
   */
  getPointsHistory(userId, guildId, limit = 50) {
    const history = this.db.prepare(`
      SELECT
        transaction_type,
        amount,
        description,
        created_at
      FROM server_transactions
      WHERE user_id = ? AND guild_id = ? AND currency_type = 'points'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, guildId, limit);

    return history;
  }
}

export default PointsManager;