// ============================================================================
// FILE 9: bot/src/commands/admin/set-tweet-limit.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('set-tweet-limit')
  .setDescription('Set how frequently users can post raid tweets')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(option =>
    option.setName('hours')
      .setDescription('Hours between allowed tweets')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(168));

export async function execute(interaction, client) {
  const hours = interaction.options.getInteger('hours');

  try {
    const config = client.db.prepare(`
      SELECT * FROM server_raid_config WHERE guild_id = ?
    `).get(interaction.guildId);

    if (!config) {
      return interaction.reply({
        content: '❌ Raid system not configured. Use `/setup-raid` first.',
        ephemeral: true,
      });
    }

    const now = Date.now();
    client.db.prepare(`
      UPDATE server_raid_config
      SET tweet_frequency_hours = ?, updated_at = ?
      WHERE guild_id = ?
    `).run(hours, now, interaction.guildId);

    logger.info(`Tweet frequency updated to ${hours} hours for guild ${interaction.guildId}`);

    await interaction.reply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Tweet Limit Updated',
        description: `Users can now post raid tweets once every **${hours} hour${hours > 1 ? 's' : ''}**.`,
        fields: [
          { name: '⏰ Frequency', value: `${hours} hour${hours > 1 ? 's' : ''}`, inline: true },
          { name: '📅 Next Tweet', value: `After ${hours}h from last tweet`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
      ephemeral: true,
    });

  } catch (error) {
    logger.error('Error updating tweet limit:', error);
    await interaction.reply({
      content: '❌ Failed to update tweet limit.',
      ephemeral: true,
    });
  }
}
