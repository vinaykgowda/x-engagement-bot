const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

class ProfileModal {
  createModal() {
    const modal = new ModalBuilder()
      .setCustomId('profile_modal')
      .setTitle('Link Twitter Profile');

    const twitterInput = new TextInputBuilder()
      .setCustomId('twitter_input')
      .setLabel('Twitter Username or URL')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('@username or https://x.com/username')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100);

    const row = new ActionRowBuilder().addComponents(twitterInput);
    modal.addComponents(row);

    return modal;
  }

  parseSubmission(interaction) {
    const twitterInput = interaction.fields.getTextInputValue('twitter_input');
    
    return {
      twitterInput: twitterInput.trim()
    };
  }
}

module.exports = new ProfileModal();
