// ============================================================================
// FILE 4: bot/src/commands/user/leaderboard.js
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';
import { pointsQueries, globalUserQueries } from '../../database/queries.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the server points leaderboard');

export async function execute(interaction, client) {
  await interaction.deferReply();

  try {
    // Get top 10
    const leaderboard = pointsQueries.getLeaderboard(client.db, interaction.guildId, 10);

    // Get user's rank if not in top 10
    const userRank = pointsQueries.getUserRank(
      client.db,
      interaction.user.id,
      interaction.guildId
    );

    const userPoints = pointsQueries.getPoints(
      client.db,
      interaction.user.id,
      interaction.guildId
    );

    // Build leaderboard text
    let leaderboardText = '';

    if (leaderboard.length === 0) {
      leaderboardText = '*No one has earned points yet. Be the first!*';
    } else {
      leaderboard.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const isCurrentUser = entry.user_id === interaction.user.id;
        const highlight = isCurrentUser ? '**' : '';

        leaderboardText += `${medal} ${highlight}<@${entry.user_id}> - ${entry.total_points} points${highlight}\n`;
      });
    }

    const embed = {
      color: 0xffd700,
      title: '🏆 Points Leaderboard',
      description: leaderboardText,
      timestamp: new Date().toISOString(),
    };

    // Add user's rank if not in top 10
    if (userRank && userRank.rank > 10 && userPoints) {
      embed.fields = [
        {
          name: '─────────────────',
          value: `**Your Rank:** #${userRank.rank}\n**Your Points:** ${userPoints.total_points}`,
          inline: false,
        },
      ];
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch leaderboard.',
    });
  }
}