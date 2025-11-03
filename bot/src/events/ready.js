// ============================================================================
// FILE 1: bot/src/events/ready.js
// ============================================================================

import { Events, ActivityType } from 'discord.js';
import logger from '../config/logger.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`✅ Bot is ready!`);
    logger.info(`📝 Logged in as: ${client.user.tag}`);
    logger.info(`🔢 Bot ID: ${client.user.id}`);
    logger.info(`🌐 Connected to ${client.guilds.cache.size} server(s)`);
    logger.info(`👥 Serving ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users`);

    // Log connected servers
    client.guilds.cache.forEach((guild) => {
      logger.info(`  - ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    });

    // Set bot status
    client.user.setPresence({
      activities: [
        {
          name: 'X Engagements 👀',
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    // Log command count
    logger.info(`📋 ${client.commands.size} commands loaded`);

    console.log('\n' + '='.repeat(60));
    console.log('  ✨ X ENGAGEMENT BOT IS READY ✨');
    console.log('='.repeat(60) + '\n');

    // Start background tasks
    startBackgroundTasks(client);
  },
};

function startBackgroundTasks(client) {
  // Check for expired engagements every 5 minutes
  setInterval(() => {
    checkExpiredEngagements(client);
  }, 5 * 60 * 1000);

  logger.info('🔄 Background tasks started');
}

function checkExpiredEngagements(client) {
  try {
    const now = Date.now();

    // Get expired engagements
    const expired = client.db.prepare(`
      SELECT * FROM server_engagements
      WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < ?
    `).all(now);

    if (expired.length > 0) {
      // Mark as inactive
      client.db.prepare(`
        UPDATE server_engagements
        SET is_active = 0
        WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < ?
      `).run(now);

      logger.info(`⏰ Expired ${expired.length} engagement campaign(s)`);
    }
  } catch (error) {
    logger.error('Error checking expired engagements:', error);
  }
}