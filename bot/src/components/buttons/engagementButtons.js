import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

class EngagementButtons {
  createEngagementRow(engagementId, requirements) {
    const buttons = [];

    if (requirements.require_like) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`engagement_like_${engagementId}`)
          .setLabel('❤️ Like')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (requirements.require_retweet) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`engagement_retweet_${engagementId}`)
          .setLabel('🔄 Retweet')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (requirements.require_comment) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`engagement_comment_${engagementId}`)
          .setLabel('💬 Comment')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (requirements.require_bookmark) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`engagement_bookmark_${engagementId}`)
          .setLabel('🔖 Bookmark')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return new ActionRowBuilder().addComponents(buttons);
  }

  createCheckButton(engagementId) {
    const button = new ButtonBuilder()
      .setCustomId(`engagement_check_${engagementId}`)
      .setLabel('✅ Check Progress')
      .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder().addComponents(button);
  }

  createCompletedButtons(tweetUrl) {
    const button = new ButtonBuilder()
      .setLabel('View Tweet')
      .setStyle(ButtonStyle.Link)
      .setURL(tweetUrl);

    return new ActionRowBuilder().addComponents(button);
  }

  updateButtonState(row, completedActions) {
    const newButtons = row.components.map(button => {
      const customId = button.data.custom_id;
      
      if (!customId) return button;

      const actionType = customId.split('_')[1];
      
      if (completedActions[actionType]) {
        return ButtonBuilder.from(button)
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);
      }

      return button;
    });

    return new ActionRowBuilder().addComponents(newButtons);
  }

  parseEngagementId(customId) {
    const parts = customId.split('_');
    return parts[parts.length - 1];
  }

  parseActionType(customId) {
    const parts = customId.split('_');
    return parts[1];
  }
}

export default new EngagementButtons();
