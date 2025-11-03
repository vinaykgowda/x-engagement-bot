// ============================================================================
// FILE 1: bot/src/database/schema.js
// ============================================================================

// Database schema definitions for SQLite

export const schema = {
  // ==========================================
  // GLOBAL TABLES (Cross-Server)
  // ==========================================

  global_users: `
    CREATE TABLE IF NOT EXISTS global_users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      discriminator TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  global_twitter_profiles: `
    CREATE TABLE IF NOT EXISTS global_twitter_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      twitter_username TEXT UNIQUE NOT NULL,
      twitter_url TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE
    )
  `,

  global_wallets: `
    CREATE TABLE IF NOT EXISTS global_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      wallet_address TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE
    )
  `,

  // ==========================================
  // SERVER TABLES (Per-Server)
  // ==========================================

  servers: `
    CREATE TABLE IF NOT EXISTS servers (
      guild_id TEXT PRIMARY KEY,
      guild_name TEXT NOT NULL,
      access_code TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  server_access_codes: `
    CREATE TABLE IF NOT EXISTS server_access_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      generated_by TEXT NOT NULL,
      used_by_guild TEXT,
      is_used INTEGER DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (used_by_guild) REFERENCES servers(guild_id) ON DELETE SET NULL
    )
  `,

  server_config: `
    CREATE TABLE IF NOT EXISTS server_config (
      guild_id TEXT PRIMARY KEY,
      engagement_channel_id TEXT,
      raid_channel_id TEXT,
      raid_post_channel_id TEXT,
      default_points_per_engagement INTEGER DEFAULT 100,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE
    )
  `,

  server_engagements: `
    CREATE TABLE IF NOT EXISTS server_engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      tweet_id TEXT NOT NULL,
      tweet_url TEXT NOT NULL,
      require_like INTEGER DEFAULT 0,
      require_retweet INTEGER DEFAULT 0,
      require_comment INTEGER DEFAULT 0,
      require_bookmark INTEGER DEFAULT 0,
      points_reward INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      expires_at INTEGER,
      total_completions INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE,
      UNIQUE(guild_id, tweet_id)
    )
  `,

  server_user_engagements: `
    CREATE TABLE IF NOT EXISTS server_user_engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engagement_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      liked INTEGER DEFAULT 0,
      retweeted INTEGER DEFAULT 0,
      commented INTEGER DEFAULT 0,
      bookmarked INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      points_awarded INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (engagement_id) REFERENCES server_engagements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE,
      UNIQUE(engagement_id, user_id)
    )
  `,

  server_points: `
    CREATE TABLE IF NOT EXISTS server_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      total_points INTEGER DEFAULT 0,
      available_points INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE,
      UNIQUE(user_id, guild_id)
    )
  `,

  server_rewards: `
    CREATE TABLE IF NOT EXISTS server_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      points_cost INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_amount REAL,
      role_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE
    )
  `,

  server_reward_claims: `
    CREATE TABLE IF NOT EXISTS server_reward_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reward_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      points_spent INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_amount REAL,
      status TEXT DEFAULT 'pending',
      transaction_hash TEXT,
      claimed_at INTEGER NOT NULL,
      FOREIGN KEY (reward_id) REFERENCES server_rewards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE
    )
  `,

  server_raid_config: `
    CREATE TABLE IF NOT EXISTS server_raid_config (
      guild_id TEXT PRIMARY KEY,
      raid_channel_id TEXT NOT NULL,
      raid_post_channel_id TEXT NOT NULL,
      default_raid_points INTEGER DEFAULT 50,
      tweet_frequency_hours INTEGER DEFAULT 24,
      auto_rewards_enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE
    )
  `,

  server_raid_role_rewards: `
    CREATE TABLE IF NOT EXISTS server_raid_role_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      reward_amount REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE,
      UNIQUE(guild_id, role_id)
    )
  `,

  server_raid_tweets: `
    CREATE TABLE IF NOT EXISTS server_raid_tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      tweet_id TEXT NOT NULL,
      tweet_url TEXT NOT NULL,
      points_earned INTEGER DEFAULT 0,
      reward_type TEXT,
      reward_amount REAL,
      reward_status TEXT DEFAULT 'pending',
      transaction_hash TEXT,
      posted_at INTEGER NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE,
      UNIQUE(guild_id, user_id, tweet_id)
    )
  `,

  server_transactions: `
    CREATE TABLE IF NOT EXISTS server_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      transaction_hash TEXT,
      description TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE
    )
  `,
};

// Indexes for better query performance
export const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_twitter_username ON global_twitter_profiles(twitter_username)',
  'CREATE INDEX IF NOT EXISTS idx_wallet_address ON global_wallets(wallet_address)',
  'CREATE INDEX IF NOT EXISTS idx_server_engagements_guild ON server_engagements(guild_id, is_active)',
  'CREATE INDEX IF NOT EXISTS idx_user_engagements_user ON server_user_engagements(user_id, guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_server_points_user ON server_points(user_id, guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_raid_tweets_user ON server_raid_tweets(guild_id, user_id, posted_at)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_user ON server_transactions(guild_id, user_id, created_at)',
];