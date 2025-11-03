// ============================================================================
// FILE 3: bot/src/database/queries.js
// ============================================================================

// Reusable SQL query functions

// ==========================================
// GLOBAL USER QUERIES
// ==========================================

export const globalUserQueries = {
  // Create or update user
  upsertUser: (db, userId, username, discriminator) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO global_users (user_id, username, discriminator, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        discriminator = excluded.discriminator,
        updated_at = excluded.updated_at
    `).run(userId, username, discriminator, now, now);
  },

  // Get user
  getUser: (db, userId) => {
    return db.prepare('SELECT * FROM global_users WHERE user_id = ?').get(userId);
  },

  // Get user with Twitter profile
  getUserWithTwitter: (db, userId) => {
    return db.prepare(`
      SELECT u.*, t.twitter_username, t.twitter_url, t.verified as twitter_verified
      FROM global_users u
      LEFT JOIN global_twitter_profiles t ON u.user_id = t.user_id
      WHERE u.user_id = ?
    `).get(userId);
  },
};

// ==========================================
// TWITTER PROFILE QUERIES
// ==========================================

export const twitterQueries = {
  // Set Twitter profile
  setProfile: (db, userId, twitterUsername, twitterUrl) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO global_twitter_profiles (user_id, twitter_username, twitter_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        twitter_username = excluded.twitter_username,
        twitter_url = excluded.twitter_url,
        updated_at = excluded.updated_at
    `).run(userId, twitterUsername, twitterUrl, now, now);
  },

  // Get profile by user ID
  getProfile: (db, userId) => {
    return db.prepare('SELECT * FROM global_twitter_profiles WHERE user_id = ?').get(userId);
  },

  // Get profile by Twitter username
  getProfileByUsername: (db, twitterUsername) => {
    return db.prepare('SELECT * FROM global_twitter_profiles WHERE twitter_username = ?').get(twitterUsername);
  },

  // Check if username exists
  usernameExists: (db, twitterUsername, excludeUserId = null) => {
    if (excludeUserId) {
      return db.prepare('SELECT 1 FROM global_twitter_profiles WHERE twitter_username = ? AND user_id != ?')
        .get(twitterUsername, excludeUserId);
    }
    return db.prepare('SELECT 1 FROM global_twitter_profiles WHERE twitter_username = ?').get(twitterUsername);
  },
};

// ==========================================
// WALLET QUERIES
// ==========================================

export const walletQueries = {
  // Set wallet
  setWallet: (db, userId, walletAddress) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO global_wallets (user_id, wallet_address, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        wallet_address = excluded.wallet_address,
        updated_at = excluded.updated_at
    `).run(userId, walletAddress, now, now);
  },

  // Get wallet
  getWallet: (db, userId) => {
    return db.prepare('SELECT * FROM global_wallets WHERE user_id = ?').get(userId);
  },

  // Check if wallet exists
  walletExists: (db, walletAddress, excludeUserId = null) => {
    if (excludeUserId) {
      return db.prepare('SELECT 1 FROM global_wallets WHERE wallet_address = ? AND user_id != ?')
        .get(walletAddress, excludeUserId);
    }
    return db.prepare('SELECT 1 FROM global_wallets WHERE wallet_address = ?').get(walletAddress);
  },
};

// ==========================================
// SERVER QUERIES
// ==========================================

export const serverQueries = {
  // Get or create server
  upsertServer: (db, guildId, guildName) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO servers (guild_id, guild_name, is_active, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        guild_name = excluded.guild_name,
        updated_at = excluded.updated_at
    `).run(guildId, guildName, now, now);
  },

  // Get server
  getServer: (db, guildId) => {
    return db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(guildId);
  },

  // Get server config
  getConfig: (db, guildId) => {
    return db.prepare('SELECT * FROM server_config WHERE guild_id = ?').get(guildId);
  },

  // Update server config
  updateConfig: (db, guildId, config) => {
    const now = Date.now();
    const fields = Object.keys(config).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(config), now, guildId];

    return db.prepare(`
      UPDATE server_config
      SET ${fields}, updated_at = ?
      WHERE guild_id = ?
    `).run(...values);
  },
};

// ==========================================
// ENGAGEMENT QUERIES
// ==========================================

export const engagementQueries = {
  // Create engagement
  createEngagement: (db, guildId, tweetId, tweetUrl, requirements, pointsReward, createdBy, expiresAt = null) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO server_engagements (
        guild_id, tweet_id, tweet_url,
        require_like, require_retweet, require_comment, require_bookmark,
        points_reward, expires_at, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId, tweetId, tweetUrl,
      requirements.like ? 1 : 0,
      requirements.retweet ? 1 : 0,
      requirements.comment ? 1 : 0,
      requirements.bookmark ? 1 : 0,
      pointsReward, expiresAt, now, createdBy
    );
  },

  // Get engagement
  getEngagement: (db, engagementId) => {
    return db.prepare('SELECT * FROM server_engagements WHERE id = ?').get(engagementId);
  },

  // Get active engagements for guild
  getActiveEngagements: (db, guildId) => {
    const now = Date.now();
    return db.prepare(`
      SELECT * FROM server_engagements
      WHERE guild_id = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC
    `).all(guildId, now);
  },

  // Get engagement by tweet ID
  getEngagementByTweetId: (db, guildId, tweetId) => {
    return db.prepare('SELECT * FROM server_engagements WHERE guild_id = ? AND tweet_id = ?')
      .get(guildId, tweetId);
  },

  // Record user engagement
  recordUserEngagement: (db, engagementId, userId, guildId) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO server_user_engagements (engagement_id, user_id, guild_id, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(engagement_id, user_id) DO NOTHING
    `).run(engagementId, userId, guildId, now);
  },

  // Update user engagement
  updateUserEngagement: (db, engagementId, userId, verificationResults) => {
    const completed = Object.values(verificationResults).every(v => v === true) ? 1 : 0;
    const completedAt = completed ? Date.now() : null;

    return db.prepare(`
      UPDATE server_user_engagements
      SET liked = ?, retweeted = ?, commented = ?, bookmarked = ?,
          completed = ?, completed_at = ?
      WHERE engagement_id = ? AND user_id = ?
    `).run(
      verificationResults.liked ? 1 : 0,
      verificationResults.retweeted ? 1 : 0,
      verificationResults.commented ? 1 : 0,
      verificationResults.bookmarked ? 1 : 0,
      completed,
      completedAt,
      engagementId,
      userId
    );
  },

  // Get user engagement
  getUserEngagement: (db, engagementId, userId) => {
    return db.prepare('SELECT * FROM server_user_engagements WHERE engagement_id = ? AND user_id = ?')
      .get(engagementId, userId);
  },
};

// ==========================================
// POINTS QUERIES
// ==========================================

export const pointsQueries = {
  // Get user points
  getPoints: (db, userId, guildId) => {
    return db.prepare('SELECT * FROM server_points WHERE user_id = ? AND guild_id = ?')
      .get(userId, guildId);
  },

  // Add points
  addPoints: (db, userId, guildId, points) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO server_points (user_id, guild_id, total_points, available_points, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id) DO UPDATE SET
        total_points = total_points + excluded.total_points,
        available_points = available_points + excluded.available_points,
        updated_at = excluded.updated_at
    `).run(userId, guildId, points, points, now);
  },

  // Spend points
  spendPoints: (db, userId, guildId, points) => {
    const now = Date.now();
    return db.prepare(`
      UPDATE server_points
      SET available_points = available_points - ?,
          updated_at = ?
      WHERE user_id = ? AND guild_id = ? AND available_points >= ?
    `).run(points, now, userId, guildId, points);
  },

  // Get leaderboard
  getLeaderboard: (db, guildId, limit = 10) => {
    return db.prepare(`
      SELECT sp.*, gu.username
      FROM server_points sp
      JOIN global_users gu ON sp.user_id = gu.user_id
      WHERE sp.guild_id = ?
      ORDER BY sp.total_points DESC
      LIMIT ?
    `).all(guildId, limit);
  },

  // Get user rank
  getUserRank: (db, userId, guildId) => {
    return db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM server_points
      WHERE guild_id = ? AND total_points > (
        SELECT total_points FROM server_points WHERE user_id = ? AND guild_id = ?
      )
    `).get(guildId, userId, guildId);
  },
};

// ==========================================
// REWARD QUERIES
// ==========================================

export const rewardQueries = {
  // Get available rewards
  getAvailableRewards: (db, guildId, userPoints) => {
    return db.prepare(`
      SELECT * FROM server_rewards
      WHERE guild_id = ? AND is_active = 1 AND points_cost <= ?
      ORDER BY points_cost ASC
    `).all(guildId, userPoints);
  },

  // Get all rewards
  getAllRewards: (db, guildId) => {
    return db.prepare('SELECT * FROM server_rewards WHERE guild_id = ? ORDER BY points_cost ASC')
      .all(guildId);
  },

  // Create reward claim
  createRewardClaim: (db, rewardId, userId, guildId, pointsSpent, rewardType, rewardAmount) => {
    const now = Date.now();
    return db.prepare(`
      INSERT INTO server_reward_claims (
        reward_id, user_id, guild_id, points_spent,
        reward_type, reward_amount, status, claimed_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(rewardId, userId, guildId, pointsSpent, rewardType, rewardAmount, now);
  },
};

export default {
  globalUserQueries,
  twitterQueries,
  walletQueries,
  serverQueries,
  engagementQueries,
  pointsQueries,
  rewardQueries,
};