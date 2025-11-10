import { EmbedBuilder } from 'discord.js';

class LeaderboardEmbed {
  create(leaderboardData, guildName) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 ${guildName} Leaderboard`)
      .setTimestamp();

    if (!leaderboardData || leaderboardData.length === 0) {
      embed.setDescription('No users on the leaderboard yet.');
      return embed;
    }

    const medals = ['🥇', '🥈', '🥉'];
    
    const leaderboard = leaderboardData.map((entry, index) => {
      const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
      return `${medal} <@${entry.user_id}> - **${entry.total_points}** points`;
    }).join('\n');

    embed.setDescription(leaderboard);
    embed.setFooter({ text: `Top ${leaderboardData.length} users` });

    return embed;
  }

  createDetailedLeaderboard(leaderboardData, guildName, page = 1, pageSize = 10) {
    const totalPages = Math.ceil(leaderboardData.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = leaderboardData.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 ${guildName} Leaderboard`)
      .setTimestamp();

    if (pageData.length === 0) {
      embed.setDescription('No users on this page.');
      return embed;
    }

    const medals = ['🥇', '🥈', '🥉'];
    
    const entries = pageData.map((entry, index) => {
      const actualIndex = startIndex + index;
      const position = actualIndex < 3 ? medals[actualIndex] : `**${actualIndex + 1}.**`;
      
      return {
        name: `${position} ${entry.username}`,
        value: `Points: **${entry.total_points}** | Available: **${entry.available_points}**`,
        inline: false
      };
    });

    embed.addFields(entries);
    embed.setFooter({ text: `Page ${page}/${totalPages} • ${leaderboardData.length} total users` });

    return embed;
  }

  createUserRankEmbed(userRank, userPoints, totalUsers) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('📊 Your Rank')
      .addFields(
        { name: '🏅 Rank', value: `#${userRank.rank} out of ${totalUsers}`, inline: true },
        { name: '💎 Total Points', value: `${userPoints.total_points}`, inline: true },
        { name: '💰 Available', value: `${userPoints.available_points}`, inline: true }
      )
      .setTimestamp();

    return embed;
  }

  createComparisonEmbed(currentUser, otherUsers) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('📊 Points Comparison')
      .setTimestamp();

    embed.addFields({
      name: '👤 You',
      value: `Rank: #${currentUser.rank}\nPoints: ${currentUser.points}`,
      inline: true
    });

    otherUsers.forEach((user, index) => {
      embed.addFields({
        name: `${index === 0 ? '👑' : '👤'} ${user.username}`,
        value: `Rank: #${user.rank}\nPoints: ${user.points}`,
        inline: true
      });
    });

    return embed;
  }
}

export default new LeaderboardEmbed();
