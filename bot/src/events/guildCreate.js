// ============================================================================
// FILE 4: bot/src/events/guildCreate.js
// ============================================================================

import { Events } from 'discord.js';
import logger from '../config/logger.js';

export default {
  name: Events.GuildCreate,
  async execute(client, guild) {
    logger.info(`📥 Bot joined new server: ${guild.name} (${guild.id})`);
    logger.info(`   Members: ${guild.memberCount}`);

    try {
      const db = client.db;
      const now = Date.now();

      // Check if server already exists
      const existingServer = db
        .prepare('SELECT * FROM servers WHERE guild_id = ?')
        .get(guild.id);

      if (existingServer) {
        logger.info(`Server ${guild.name} already in database`);

        // Update server name if changed
        db.prepare('UPDATE servers SET guild_name = ?, updated_at = ? WHERE guild_id = ?')
          .run(guild.name, now, guild.id);

        return;
      }

      // Add server to database
      db.prepare(`
        INSERT INTO servers (guild_id, guild_name, is_active, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?)
      `).run(guild.id, guild.name, now, now);

      // Create default server config
      db.prepare(`
        INSERT INTO server_config (guild_id, default_points_per_engagement, created_at, updated_at)
        VALUES (?, 100, ?, ?)
      `).run(guild.id, now, now);

      logger.info(`✓ Server ${guild.name} added to database`);

      // Try to send welcome message
      if (guild.systemChannel && guild.systemChannel.permissionsFor(client.user).has('SendMessages')) {
        await guild.systemChannel.send({
          embeds: [
            {
              color: 0x1da1f2,
              title: '👋 Thanks for adding X Engagement Bot!',
              description:
                'I help you track and reward Twitter/X engagement!\n\n' +
                '**🎯 Getting Started:**\n' +
                '• **Admins**: Use `/post-engagement` to create campaigns\n' +
                '• **Users**: Use `/set-profile` to link your Twitter\n' +
                '• **Setup Raids**: Use `/setup-raid` to enable tweet rewards\n\n' +
                '**📊 Features:**\n' +
                '✅ Track likes, retweets, comments, bookmarks\n' +
                '✅ Points & leaderboards\n' +
                '✅ Solana token rewards\n' +
                '✅ Automatic raid rewards\n' +
                '✅ Global user profiles\n\n' +
                '**🆘 Need Help?**\n' +
                'Use `/help` to see all commands!',
              thumbnail: {
                url: client.user.displayAvatarURL(),
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }
    } catch (error) {
      logger.error(`Error setting up new server ${guild.name}:`, error);
    }
  },
};