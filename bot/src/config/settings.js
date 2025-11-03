// ============================================================================
// FILE 1: bot/src/config/settings.js
// ============================================================================

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

const settings = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
  },

  // Database Configuration
  database: {
    path: process.env.DATABASE_PATH || '../database/bot.db',
  },

  // Scraper Service
  scraper: {
    apiUrl: process.env.SCRAPER_API_URL || 'http://localhost:8000',
    apiKey: process.env.SCRAPER_API_KEY,
  },

  // Solana Configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    network: process.env.SOLANA_NETWORK || 'mainnet-beta',
    tokenMintAddress: process.env.TOKEN_MINT_ADDRESS,
  },

  // Super Admin
  superAdmin: {
    userId: process.env.SUPER_ADMIN_USER_ID,
  },

  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
  },

  // Rate Limiting
  rateLimiting: {
    maxChecksPerUserPerMinute: parseInt(process.env.MAX_CHECKS_PER_USER_PER_MINUTE) || 2,
    maxEngagementChecksPerHour: parseInt(process.env.MAX_ENGAGEMENT_CHECKS_PER_HOUR) || 100,
  },

  // Feature Flags
  features: {
    autoRewards: process.env.ENABLE_AUTO_REWARDS === 'true',
    raidMonitoring: process.env.ENABLE_RAID_MONITORING === 'true',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
};

// Validation
const requiredSettings = [
  'discord.token',
  'discord.clientId',
  'security.encryptionKey',
];

function validateSettings() {
  const missing = [];

  requiredSettings.forEach((setting) => {
    const keys = setting.split('.');
    let value = settings;

    for (const key of keys) {
      value = value?.[key];
    }

    if (!value) {
      missing.push(setting);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((s) => `  - ${s.toUpperCase().replace(/\./g, '_')}`).join('\n')}\n\nPlease check your .env file.`
    );
  }
}

// Validate on load
validateSettings();

export default settings;