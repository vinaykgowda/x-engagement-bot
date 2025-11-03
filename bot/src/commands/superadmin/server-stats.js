// ============================================================================
// FILE 3: bot/src/commands/superadmin/server-stats.js
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';
import settings from '../../config/settings.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('server-stats')
  .setDescription('[Super Admin] View cross-server statistics');

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
    // Get overall stats
    const totalServers = client.db.prepare(
      'SELECT COUNT(*) as count FROM servers WHERE is_active = 1'
    ).get().count;

    const totalUsers = client.db.prepare(
      'SELECT COUNT(DISTINCT user_id) as count FROM global_users'
    ).get().count;

    const totalTwitterProfiles = client.db.prepare(
      'SELECT COUNT(*) as count FROM global_twitter_profiles'
    ).get().count;

    const totalWallets = client.db.prepare(
      'SELECT COUNT(*) as count FROM global_wallets'
    ).get().count;

    const totalEngagements = client.db.prepare(
      'SELECT COUNT(*) as count FROM server_engagements'
    ).get().count;

    const activeEngagements = client.db.prepare(
      'SELECT COUNT(*) as count FROM server_engagements WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)'
    ).get(Date.now()).count;

    const totalCompletions = client.db.prepare(
      'SELECT COUNT(*) as count FROM server_user_engagements WHERE completed = 1'
    ).get().count;

    const totalPoints = client.db.prepare(
      'SELECT SUM(total_points) as total FROM server_points'
    ).get().total || 0;

    const totalPointsSpent = client.db.prepare(
      'SELECT SUM(total_points - available_points) as spent FROM server_points'
    ).get().spent || 0;

    const totalRewardsClaimed = client.db.prepare(
      'SELECT COUNT(*) as count FROM server_reward_claims'
    ).get().count;

    const totalRaidTweets = client.db.prepare(
      'SELECT COUNT(*) as count FROM server_raid_tweets'
    ).get().count;

    const totalTransactions = client.db.prepare(
      'SELECT COUNT(*) as count FROM server_transactions'
    ).get().count;

    // Get top servers by activity
    const topServers = client.db.prepare(`
      SELECT
        s.guild_id,
        s.guild_name,
        COUNT(DISTINCT se.id) as engagement_count,
        COUNT(DISTINCT sp.user_id) as user_count,
        SUM(sp.total_points) as total_points
      FROM servers s
      LEFT JOIN server_engagements se ON s.guild_id = se.guild_id
      LEFT JOIN server_points sp ON s.guild_id = sp.guild_id
      WHERE s.is_active = 1
      GROUP BY s.guild_id
      ORDER BY engagement_count DESC, total_points DESC
      LIMIT 5
    `).all();

    // Get top users by points (across all servers)
    const topUsers = client.db.prepare(`
      SELECT
        gu.user_id,
        gu.username,
        SUM(sp.total_points) as total_points,
        COUNT(DISTINCT sp.guild_id) as server_count
      FROM global_users gu
      JOIN server_points sp ON gu.user_id = sp.user_id
      GROUP BY gu.user_id
      ORDER BY total_points DESC
      LIMIT 5
    `).all();

    // Build embed
    const embed = {
      color: 0x5865f2,
      title: '📊 Cross-Server Statistics',
      description: 'Global bot statistics across all servers',
      fields: [
        {
          name: '🌐 Servers & Users',
          value:
            `**Total Servers:** ${totalServers}\n` +
            `**Total Users:** ${totalUsers}\n` +
            `**Twitter Profiles:** ${totalTwitterProfiles}\n` +
            `**Wallets Set:** ${totalWallets}`,
          inline: true,
        },
        {
          name: '🎯 Engagements',
          value:
            `**Total Campaigns:** ${totalEngagements}\n` +
            `**Active Campaigns:** ${activeEngagements}\n` +
            `**Total Completions:** ${totalCompletions}\n` +
            `**Completion Rate:** ${totalEngagements > 0 ? ((totalCompletions / totalEngagements) * 100).toFixed(1) : 0}%`,
          inline: true,
        },
        {
          name: '🏆 Points & Rewards',
          value:
            `**Total Points Earned:** ${totalPoints.toLocaleString()}\n` +
            `**Points Spent:** ${totalPointsSpent.toLocaleString()}\n` +
            `**Rewards Claimed:** ${totalRewardsClaimed}\n` +
            `**Available Points:** ${(totalPoints - totalPointsSpent).toLocaleString()}`,
          inline: true,
        },
        {
          name: '🚀 Raid System',
          value:
            `**Total Raid Tweets:** ${totalRaidTweets}\n` +
            `**Transactions:** ${totalTransactions}`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add top servers
    if (topServers.length > 0) {
      embed.fields.push({
        name: '🏅 Top 5 Servers by Activity',
        value: topServers.map((s, i) =>
          `${i + 1}. **${s.guild_name}**\n` +
          `   ├ ${s.engagement_count} campaigns\n` +
          `   ├ ${s.user_count} users\n` +
          `   └ ${(s.total_points || 0).toLocaleString()} points`
        ).join('\n'),
        inline: false,
      });
    }

    // Add top users
    if (topUsers.length > 0) {
      embed.fields.push({
        name: '👑 Top 5 Users by Points',
        value: topUsers.map((u, i) =>
          `${i + 1}. **${u.username}**\n` +
          `   ├ ${u.total_points.toLocaleString()} points\n` +
          `   └ Active in ${u.server_count} server${u.server_count > 1 ? 's' : ''}`
        ).join('\n'),
        inline: false,
      });
    }

    // Add access codes stats
    const accessCodeStats = client.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_used = 0 THEN 1 ELSE 0 END) as unused,
        SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < ? THEN 1 ELSE 0 END) as expired
      FROM server_access_codes
    `).get(Date.now());

    embed.fields.push({
      name: '🔑 Access Codes',
      value:
        `**Total Generated:** ${accessCodeStats.total}\n` +
        `**Used:** ${accessCodeStats.used}\n` +
        `**Available:** ${accessCodeStats.unused}\n` +
        `**Expired:** ${accessCodeStats.expired}`,
      inline: true,
    });

    // Add bot info
    const botGuilds = client.guilds.cache.size;
    const botUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    embed.fields.push({
      name: '🤖 Bot Status',
      value:
        `**Connected Guilds:** ${botGuilds}\n` +
        `**Total Members:** ${botUsers.toLocaleString()}\n` +
        `**Uptime:** ${Math.floor(client.uptime / 1000 / 60)} minutes`,
      inline: true,
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error fetching server stats:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch statistics.',
    });
  }
}