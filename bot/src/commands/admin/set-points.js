// ============================================================================
// FILE 3: bot/src/commands/admin/set-points.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { serverQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('set-points')
  .setDescription('Set default points per engagement')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(option =>
    option.setName('points')
      .setDescription('Default points to award')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(10000));

export async function execute(interaction, client) {
  const points = interaction.options.getInteger('points');

  try {
    // Update server config
    serverQueries.updateConfig(client.db, interaction.guildId, {
      default_points_per_engagement: points,
    });

    logger.info(`Default points updated to ${points} for guild ${interaction.guildId}`);

    await interaction.reply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Points Updated',
        description: `Default engagement points set to **${points}**`,
        fields: [
          { name: '🎁 Points Per Engagement', value: points.toString(), inline: true },
          { name: '📊 Status', value: 'Active', inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
      ephemeral: true,
    });

  } catch (error) {
    logger.error('Error setting points:', error);
    await interaction.reply({
      content: '❌ Failed to update points setting.',
      ephemeral: true,
    });
  }
}