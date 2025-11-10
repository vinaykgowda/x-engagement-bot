import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { engagementQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

class CommentModal {
  createModal(engagementId) {
    const modal = new ModalBuilder()
      .setCustomId(`comment_modal_${engagementId}`)
      .setTitle('Submit Your Comment');

    const commentInput = new TextInputBuilder()
      .setCustomId('comment_input')
      .setLabel('Comment Text')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter your comment or reply text')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(280);

    const tweetUrlInput = new TextInputBuilder()
      .setCustomId('comment_url_input')
      .setLabel('Comment/Reply URL (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://x.com/username/status/...')
      .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(commentInput);
    const row2 = new ActionRowBuilder().addComponents(tweetUrlInput);

    modal.addComponents(row1, row2);

    return modal;
  }

  async execute(interaction, client) {
    try {
      // Parse engagement ID from the modal's customId
      const engagementId = this.parseEngagementId(interaction.customId);

      if (!engagementId) {
        await interaction.editReply({
          content: '❌ Invalid engagement ID. Please try again.',
          ephemeral: true
        });
        return;
      }

      // Get comment data from modal submission
      const data = this.parseSubmission(interaction);

      if (!data.commentText) {
        await interaction.editReply({
          content: '❌ Please provide comment text.',
          ephemeral: true
        });
        return;
      }

      // Get the engagement details
      const engagement = engagementQueries.getEngagement(client.db, engagementId);

      if (!engagement) {
        await interaction.editReply({
          content: '❌ Engagement not found. It may have expired or been deleted.',
          ephemeral: true
        });
        return;
      }

      // Check if engagement is still active
      if (!engagement.is_active) {
        await interaction.editReply({
          content: '❌ This engagement is no longer active.',
          ephemeral: true
        });
        return;
      }

      // Record or update user engagement
      engagementQueries.recordUserEngagement(
        client.db,
        engagementId,
        interaction.user.id,
        interaction.guildId
      );

      // Update the commented flag
      const currentEngagement = engagementQueries.getUserEngagement(
        client.db,
        engagementId,
        interaction.user.id
      );

      engagementQueries.updateUserEngagement(
        client.db,
        engagementId,
        interaction.user.id,
        {
          liked: currentEngagement?.liked || false,
          retweeted: currentEngagement?.retweeted || false,
          commented: true,
          bookmarked: currentEngagement?.bookmarked || false
        }
      );

      await interaction.editReply({
        content: `✅ **Comment Submitted!**\n\n` +
                 `**Comment:** ${data.commentText.substring(0, 100)}${data.commentText.length > 100 ? '...' : ''}\n` +
                 (data.commentUrl ? `**URL:** ${data.commentUrl}\n\n` : '\n') +
                 `Your comment has been recorded. Use the \`Check\` button to verify your engagement.`,
        ephemeral: true
      });

      logger.info(`Comment submitted by user ${interaction.user.id} for engagement ${engagementId}`);
    } catch (error) {
      logger.error('Error handling comment modal submission:', error);
      await interaction.editReply({
        content: '❌ An error occurred while submitting your comment. Please try again.',
        ephemeral: true
      });
    }
  }

  parseSubmission(interaction) {
    const commentText = interaction.fields.getTextInputValue('comment_input');
    let commentUrl;
    try {
      commentUrl = interaction.fields.getTextInputValue('comment_url_input');
    } catch {
      commentUrl = '';
    }

    return {
      commentText: commentText.trim(),
      commentUrl: commentUrl?.trim() || null
    };
  }

  parseEngagementId(customId) {
    const parts = customId.split('_');
    return parts[parts.length - 1];
  }
}

export default new CommentModal();
