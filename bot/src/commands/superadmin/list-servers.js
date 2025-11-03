// ============================================================================
// FILE 2: bot/src/commands/superadmin/list-servers.js
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';
import settings from '../../config/settings.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('list-servers')
  .setDescription('[Super Admin] List all connected servers')
  .addBooleanOption(option =>
    option.setName('show-inactive')
      .setDescription('Show inactive servers too'));

export async function execute(interaction, client) {
  // Check if user is super admin
  if (interaction.user.id !== settings.superAdmin.userId) {
    return interaction.reply({
      content: '❌ This command is restricted to the super administrator.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const showInactive = interaction.options.getBoolean('show-inactive') || false;

    // Get servers from database
    const query = showInactive
      ? 'SELECT * FROM servers ORDER BY created_at DESC'
      : 'SELECT * FROM servers WHERE is_active = 1 ORDER BY created_at DESC';

    const servers = client.db.prepare(query).all();

    if (servers.length === 0) {
      return interaction.editReply({
        content: '📋 No servers found.',
      });
    }

    // Get stats for each server
    const serverStats = servers.map(server => {
      const guild = client.guilds.cache.get(server.guild_id);

      // Get engagement count
      const engagementCount = client.db.prepare(
        'SELECT COUNT(*) as count FROM server_engagements WHERE guild_id = ?'
      ).get(server.guild_id).count;

      // Get user count
      const userCount = client.db.prepare(
        'SELECT COUNT(DISTINCT user_id) as count FROM server_points WHERE guild_id = ?'
      ).get(server.guild_id).count;

      // Get total points distributed
      const totalPoints = client.db.prepare(
        'SELECT SUM(total_points) as total FROM server_points WHERE guild_id = ?'
      ).get(server.guild_id).total || 0;

      return {
        ...server,
        memberCount: guild?.memberCount || 'Unknown',
        connected: !!guild,
        engagementCount,
        userCount,
        totalPoints,
      };
    });

    // Split into chunks of 10 for pagination
    const chunks = [];
    for (let i = 0; i < serverStats.length; i += 10) {
      chunks.push(serverStats.slice(i, i + 10));
    }

    // Create embeds
    const embeds = chunks.map((chunk, chunkIndex) => {
      const embed = {
        color: 0x1da1f2,
        title: `🌐 Connected Servers (${serverStats.length} total)`,
        description: `Page ${chunkIndex + 1} of ${chunks.length}`,
        fields: chunk.map(server => ({
          name: `${server.connected ? '🟢' : '🔴'} ${server.guild_name}`,
          value:
            `**ID:** \`${server.guild_id}\`\n` +
            `**Members:** ${server.memberCount}\n` +
            `**Engagements:** ${server.engagementCount}\n` +
            `**Active Users:** ${server.userCount}\n` +
            `**Total Points:** ${server.totalPoints}\n` +
            `**Joined:** ${new Date(server.created_at).toLocaleDateString()}\n` +
            `**Status:** ${server.is_active ? 'Active' : 'Inactive'}`,
          inline: true,
        })),
        footer: {
          text: `🟢 Online | 🔴 Offline`,
        },
        timestamp: new Date().toISOString(),
      };

      return embed;
    });

    // Send first embed
    await interaction.editReply({ embeds: [embeds[0]] });

    // Send remaining embeds as follow-ups if any
    for (let i = 1; i < embeds.length; i++) {
      await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
    }

  } catch (error) {
    logger.error('Error listing servers:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch server list.',
    });
  }
}