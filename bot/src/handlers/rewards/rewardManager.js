// ============================================================================
// FILE 2: bot/src/handlers/rewards/rewardManager.js
// ============================================================================

import { rewardQueries, pointsQueries, globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

class RewardManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new reward
   */
  createReward(guildId, name, description, pointsCost, rewardType, rewardAmount, roleId, createdBy) {
    try {
      const now = Date.now();

      const result = this.db.prepare(`
        INSERT INTO server_rewards (
          guild_id, name, description, points_cost,
          reward_type, reward_amount, role_id, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        guildId, name, description, pointsCost,
        rewardType, rewardAmount, roleId, now
      );

      logger.info(`Reward created: ${name} (${pointsCost} pts) by ${createdBy}`);

      return { success: true, rewardId: result.lastInsertRowid };
    } catch (error) {
      logger.error('Error creating reward:', error);
      throw error;
    }
  }

  /**
   * Get available rewards for user
   */
  getAvailableRewards(guildId, userId) {
    const userPoints = pointsQueries.getPoints(this.db, userId, guildId);
    const availablePoints = userPoints?.available_points || 0;

    return rewardQueries.getAvailableRewards(this.db, guildId, availablePoints);
  }

  /**
   * Get all rewards for a guild
   */
  getAllRewards(guildId) {
    return rewardQueries.getAllRewards(this.db, guildId);
  }

  /**
   * Get reward by ID
   */
  getReward(rewardId) {
    return this.db.prepare('SELECT * FROM server_rewards WHERE id = ?').get(rewardId);
  }

  /**
   * Claim a reward
   */
  async claimReward(rewardId, userId, guildId) {
    try {
      // Ensure user exists
      globalUserQueries.upsertUser(this.db, userId, 'Unknown', '');

      // Get reward details
      const reward = this.getReward(rewardId);
      if (!reward) {
        throw new Error('Reward not found');
      }

      if (!reward.is_active) {
        throw new Error('Reward is no longer active');
      }

      // Check if user has enough points
      const userPoints = pointsQueries.getPoints(this.db, userId, guildId);
      if (!userPoints || userPoints.available_points < reward.points_cost) {
        throw new Error('Insufficient points');
      }

      // Deduct points
      pointsQueries.spendPoints(this.db, userId, guildId, reward.points_cost);

      // Create reward claim record
      const claimResult = rewardQueries.createRewardClaim(
        this.db,
        rewardId,
        userId,
        guildId,
        reward.points_cost,
        reward.reward_type,
        reward.reward_amount
      );

      logger.reward('claimed', userId, reward.points_cost, 'points');
      logger.info(`User ${userId} claimed reward: ${reward.name} for ${reward.points_cost} points`);

      return {
        success: true,
        claimId: claimResult.lastInsertRowid,
        reward,
        remainingPoints: userPoints.available_points - reward.points_cost,
      };
    } catch (error) {
      logger.error('Error claiming reward:', error);
      throw error;
    }
  }

  /**
   * Process reward claim (send actual reward)
   */
  async processRewardClaim(claimId, client) {
    try {
      const claim = this.db.prepare(`
        SELECT rc.*, sr.name, sr.reward_type, sr.reward_amount, sr.role_id
        FROM server_reward_claims rc
        JOIN server_rewards sr ON rc.reward_id = sr.id
        WHERE rc.id = ?
      `).get(claimId);

      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.status !== 'pending') {
        throw new Error('Claim already processed');
      }

      let success = false;
      let txHash = null;

      // Process based on reward type
      if (claim.reward_type === 'role') {
        // Assign role
        success = await this.assignRole(claim.guild_id, claim.user_id, claim.role_id, client);
      } else if (claim.reward_type === 'sol' || claim.reward_type === 'token') {
        // Send crypto reward
        const { default: solanaManager } = await import('./solanaManager.js');

        // Get user wallet
        const wallet = this.db.prepare(
          'SELECT * FROM global_wallets WHERE user_id = ?'
        ).get(claim.user_id);

        if (!wallet) {
          throw new Error('User wallet not set');
        }

        txHash = await solanaManager.sendReward(
          wallet.wallet_address,
          claim.reward_amount,
          claim.reward_type
        );

        success = !!txHash;
      }

      // Update claim status
      this.db.prepare(`
        UPDATE server_reward_claims
        SET status = ?, transaction_hash = ?
        WHERE id = ?
      `).run(success ? 'completed' : 'failed', txHash, claimId);

      // Log transaction
      if (success) {
        this.db.prepare(`
          INSERT INTO server_transactions (
            guild_id, user_id, transaction_type, amount,
            currency_type, status, transaction_hash,
            description, created_at
          ) VALUES (?, ?, 'reward_claim', ?, ?, 'completed', ?, ?, ?)
        `).run(
          claim.guild_id,
          claim.user_id,
          claim.reward_amount || 0,
          claim.reward_type,
          txHash,
          `Claimed reward: ${claim.name}`,
          Date.now()
        );
      }

      logger.info(`Reward claim ${claimId} processed: ${success ? 'success' : 'failed'}`);

      return { success, txHash, claim };
    } catch (error) {
      logger.error('Error processing reward claim:', error);

      // Mark as failed
      this.db.prepare(`
        UPDATE server_reward_claims
        SET status = 'failed'
        WHERE id = ?
      `).run(claimId);

      throw error;
    }
  }

  /**
   * Assign role reward
   */
  async assignRole(guildId, userId, roleId, client) {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        throw new Error('Guild not found');
      }

      const member = await guild.members.fetch(userId);
      if (!member) {
        throw new Error('Member not found');
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      await member.roles.add(role);
      logger.info(`Assigned role ${role.name} to user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error assigning role:', error);
      return false;
    }
  }

  /**
   * Get user's claimed rewards
   */
  getUserClaimedRewards(userId, guildId) {
    return this.db.prepare(`
      SELECT rc.*, sr.name, sr.description
      FROM server_reward_claims rc
      JOIN server_rewards sr ON rc.reward_id = sr.id
      WHERE rc.user_id = ? AND rc.guild_id = ?
      ORDER BY rc.claimed_at DESC
    `).all(userId, guildId);
  }

  /**
   * Get pending claims
   */
  getPendingClaims(guildId = null) {
    const query = guildId
      ? `SELECT * FROM server_reward_claims WHERE status = 'pending' AND guild_id = ? ORDER BY claimed_at ASC`
      : `SELECT * FROM server_reward_claims WHERE status = 'pending' ORDER BY claimed_at ASC`;

    return guildId
      ? this.db.prepare(query).all(guildId)
      : this.db.prepare(query).all();
  }

  /**
   * Update reward
   */
  updateReward(rewardId, updates) {
    try {
      const allowedFields = ['name', 'description', 'points_cost', 'reward_amount', 'is_active'];
      const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE server_rewards
        SET ${setClause}
        WHERE id = ?
      `).run(...values, rewardId);

      logger.info(`Reward ${rewardId} updated`);

      return { success: true };
    } catch (error) {
      logger.error('Error updating reward:', error);
      throw error;
    }
  }

  /**
   * Delete reward
   */
  deleteReward(rewardId) {
    try {
      this.db.prepare('DELETE FROM server_rewards WHERE id = ?').run(rewardId);
      logger.info(`Reward ${rewardId} deleted`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting reward:', error);
      throw error;
    }
  }
}

export default RewardManager;