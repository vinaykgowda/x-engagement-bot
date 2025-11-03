const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

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

  parseSubmission(interaction) {
    const commentText = interaction.fields.getTextInputValue('comment_input');
    const commentUrl = interaction.fields.getTextInputValue('comment_url_input');
    
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

module.exports = new CommentModal();
