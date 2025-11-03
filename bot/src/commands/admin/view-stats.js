// ============================================================================
// FILE 5: bot/src/commands/admin/view-stats.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { engagementQueries } from '../../database/queries.js';

export const data = new SlashCommandBuilder()
  .setName('view-stats')
  .setDescription('View engagement statistics')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option.setName('tweet-id')
      .setDescription('Specific tweet ID (optional)'));

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const tweetId = interaction.options.getString('tweet-id');

    if (tweetId) {
      // Show stats for specific engagement
      await showEngagementStats(interaction, client, tweetId);
    } else {
      // Show overall stats
      await showOverallStats(interaction, client);
    }

  } catch (error) {
    await interaction.editReply('❌ Failed to fetch stats.');
  }
}

async function showEngagementStats(interaction, client, tweetId) {
  const engagement = engagementQueries.getEngagementByTweetId(
    client.db,
    interaction.guildId,
    tweetId
  );

  if (!engagement) {
    return interaction.editReply('❌ Engagement not found.');
  }

  // Get completion stats
  const stats = client.db.prepare(`
    SELECT
      COUNT(*) as total_attempts,
      SUM(completed) as completions,
      SUM(liked) as likes,
      SUM(retweeted) as retweets,
      SUM(commented) as comments,
      SUM(bookmarked) as bookmarks
    FROM server_user_engagements
    WHERE engagement_id = ?
  `).get(engagement.id);

  const embed = {
    color: 0x1da1f2,
    title: '📊 Engagement Statistics',
    fields: [
      { name: '🔗 Tweet ID', value: engagement.tweet_id, inline: true },
      { name: '🎁 Points Reward', value: engagement.points_reward.toString(), inline: true },
      { name: '✅ Completions', value: (stats.completions || 0).toString(), inline: true },
      { name: '👥 Total Attempts', value: (stats.total_attempts || 0).toString(), inline: true },
      { name: '❤️ Likes', value: (stats.likes || 0).toString(), inline: true },
      { name: '🔁 Retweets', value: (stats.retweets || 0).toString(), inline: true },
      { name: '💬 Comments', value: (stats.comments || 0).toString(), inline: true },
      { name: '🔖 Bookmarks', value: (stats.bookmarks || 0).toString(), inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  await interaction.editReply({ embeds: [embed] });
}

async function showOverallStats(interaction, client) {
  const stats = client.db.prepare(`
    SELECT
      COUNT(DISTINCT se.id) as total_engagements,
      SUM(se.total_completions) as total_completions,
      COUNT(DISTINCT sue.user_id) as unique_users,
      SUM(sue.points_awarded) as total_points_awarded
    FROM server_engagements se
    LEFT JOIN server_user_engagements sue ON se.id = sue.engagement_id
    WHERE se.guild_id = ?
  `).get(interaction.guildId);

  const activeEngagements = engagementQueries.getActiveEngagements(
    client.db,
    interaction.guildId
  );

  const embed = {
    color: 0x1da1f2,
    title: '📊 Server Engagement Statistics',
    fields: [
      { name: '🎯 Total Campaigns', value: (stats.total_engagements || 0).toString(), inline: true },
      { name: '✅ Active Campaigns', value: activeEngagements.length.toString(), inline: true },
      { name: '👥 Unique Participants', value: (stats.unique_users || 0).toString(), inline: true },
      { name: '🏆 Total Completions', value: (stats.total_completions || 0).toString(), inline: true },
      { name: '🎁 Points Distributed', value: (stats.total_points_awarded || 0).toString(), inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  await interaction.editReply({ embeds: [embed] });
}
