// ============================================================================
// FILE 6: bot/src/commands/admin/set-expiration.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('set-expiration')
  .setDescription('Set or update engagement expiration')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option.setName('tweet-id')
      .setDescription('Tweet ID of the engagement')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('hours')
      .setDescription('Hours until expiration (0 to remove expiration)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(720));

export async function execute(interaction, client) {
  const tweetId = interaction.options.getString('tweet-id');
  const hours = interaction.options.getInteger('hours');

  try {
    const engagement = client.db.prepare(`
      SELECT * FROM server_engagements
      WHERE guild_id = ? AND tweet_id = ?
    `).get(interaction.guildId, tweetId);

    if (!engagement) {
      return interaction.reply({
        content: '❌ Engagement not found.',
        ephemeral: true,
      });
    }

    const expiresAt = hours > 0 ? Date.now() + (hours * 60 * 60 * 1000) : null;

    client.db.prepare(`
      UPDATE server_engagements
      SET expires_at = ?
      WHERE id = ?
    `).run(expiresAt, engagement.id);

    logger.info(`Expiration updated for engagement ${tweetId} in guild ${interaction.guildId}`);

    await interaction.reply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Expiration Updated',
        description: hours > 0
          ? `Engagement will expire in **${hours} hours**\n${new Date(expiresAt).toLocaleString()}`
          : 'Expiration removed - engagement will not expire',
        timestamp: new Date().toISOString(),
      }],
      ephemeral: true,
    });

  } catch (error) {
    logger.error('Error updating expiration:', error);
    await interaction.reply({
      content: '❌ Failed to update expiration.',
      ephemeral: true,
    });
  }
}