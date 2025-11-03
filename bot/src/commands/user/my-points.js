// ============================================================================
// FILE 3: bot/src/commands/user/my-points.js
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';
import { pointsQueries, globalUserQueries } from '../../database/queries.js';

export const data = new SlashCommandBuilder()
  .setName('my-points')
  .setDescription('Check your points balance');

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Ensure user exists
    globalUserQueries.upsertUser(
      client.db,
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator
    );

    // Get points
    const points = pointsQueries.getPoints(
      client.db,
      interaction.user.id,
      interaction.guildId
    );

    // Get rank
    const rankData = pointsQueries.getUserRank(
      client.db,
      interaction.user.id,
      interaction.guildId
    );

    const totalPoints = points?.total_points || 0;
    const availablePoints = points?.available_points || 0;
    const spentPoints = totalPoints - availablePoints;
    const rank = rankData?.rank || 'Unranked';

    const embed = {
      color: 0xffd700,
      title: '🏆 Your Points',
      thumbnail: {
        url: interaction.user.displayAvatarURL(),
      },
      fields: [
        {
          name: '💰 Total Points Earned',
          value: totalPoints.toString(),
          inline: true,
        },
        {
          name: '✨ Available Points',
          value: availablePoints.toString(),
          inline: true,
        },
        {
          name: '💸 Points Spent',
          value: spentPoints.toString(),
          inline: true,
        },
        {
          name: '🏅 Server Rank',
          value: `#${rank}`,
          inline: true,
        },
      ],
      footer: {
        text: 'Complete engagements to earn more points!',
      },
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error fetching points:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch your points.',
    });
  }
}