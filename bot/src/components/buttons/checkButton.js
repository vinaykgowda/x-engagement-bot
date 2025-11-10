import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { connection, engagementQueries, globalUserQueries, pointsQueries } from '../../database/queries.js';
import scraperClient from '../../handlers/scraper/scraperClient.js';
import logger from '../../config/logger.js';

class CheckButton {
  // Main execute method called from interactionCreate.js
  async execute(interaction, client, engagementId) {
    return this.handleCheck(interaction, engagementId);
  }

  async handleCheck(interaction, engagementId) {
    try {
      // Note: Reply is already deferred by the caller in interactionCreate.js
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      const engagement = engagementQueries.getEngagement(connection, engagementId);

      if (!engagement) {
        return interaction.editReply('❌ Engagement not found');
      }

      const userProfile = globalUserQueries.getUserWithTwitter(connection, userId);

      if (!userProfile || !userProfile.twitter_username) {
        return interaction.editReply('❌ Please link your Twitter profile first using `/set-profile`');
      }

      const userEngagement = engagementQueries.getUserEngagement(connection, engagementId, userId);

      if (!userEngagement) {
        engagementQueries.recordUserEngagement(connection, engagementId, userId, guildId);
      }

      const checkResult = await scraperClient.checkUserEngagement(
        userProfile.twitter_username,
        engagement.tweet_id
      );

      if (!checkResult.success) {
        return interaction.editReply('❌ Failed to check engagement. Please try again.');
      }

      const results = checkResult.data;
      const verificationResults = {
        liked: engagement.require_like ? results.liked : true,
        retweeted: engagement.require_retweet ? results.retweeted : true,
        commented: engagement.require_comment ? results.commented : true,
        bookmarked: engagement.require_bookmark ? results.bookmarked : true
      };

      engagementQueries.updateUserEngagement(
        connection,
        engagementId,
        userId,
        verificationResults
      );

      const allCompleted = Object.values(verificationResults).every(v => v === true);

      if (allCompleted) {
        pointsQueries.addPoints(connection, userId, guildId, engagement.points_reward);

        connection.prepare(`
          UPDATE server_engagements
          SET total_completions = total_completions + 1
          WHERE id = ?
        `).run(engagementId);

        connection.prepare(`
          UPDATE server_user_engagements
          SET points_awarded = ?
          WHERE engagement_id = ? AND user_id = ?
        `).run(engagement.points_reward, engagementId, userId);
      }

      return this.sendCheckResult(interaction, verificationResults, engagement, allCompleted);

    } catch (error) {
      logger.error('Error handling check button:', error);
      return interaction.editReply('❌ An error occurred while checking your engagement');
    }
  }

  sendCheckResult(interaction, results, engagement, completed) {
    const embed = new EmbedBuilder()
      .setColor(completed ? '#00FF00' : '#FFA500')
      .setTitle(completed ? '✅ Engagement Completed!' : '📊 Engagement Progress')
      .setDescription(`Progress for: ${engagement.tweet_url}`)
      .setTimestamp();

    const fields = [];

    if (engagement.require_like) {
      fields.push({
        name: '❤️ Like',
        value: results.liked ? '✅ Completed' : '❌ Not completed',
        inline: true
      });
    }

    if (engagement.require_retweet) {
      fields.push({
        name: '🔄 Retweet',
        value: results.retweeted ? '✅ Completed' : '❌ Not completed',
        inline: true
      });
    }

    if (engagement.require_comment) {
      fields.push({
        name: '💬 Comment',
        value: results.commented ? '✅ Completed' : '❌ Not completed',
        inline: true
      });
    }

    if (engagement.require_bookmark) {
      fields.push({
        name: '🔖 Bookmark',
        value: results.bookmarked ? '✅ Completed' : '❌ Not completed',
        inline: true
      });
    }

    embed.addFields(fields);

    if (completed) {
      embed.addFields({
        name: '🎁 Reward',
        value: `+${engagement.points_reward} points`,
        inline: false
      });
    }

    return interaction.editReply({ embeds: [embed] });
  }

  createCheckButton(engagementId) {
    const button = new ButtonBuilder()
      .setCustomId(`check_${engagementId}`)
      .setLabel('✅ Check Progress')
      .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder().addComponents(button);
  }

  parseEngagementId(customId) {
    return customId.split('_')[1];
  }
}

export default new CheckButton();
