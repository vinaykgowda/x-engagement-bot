import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import profileManager from '../../handlers/profile/profileManager.js';
import { globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

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

  async execute(interaction, client) {
    try {
      // Get the twitter input from the modal submission
      // Note: The field customId varies depending on where the modal was shown
      // Commands use 'twitter_username', button modals use 'twitter_username'
      let twitterInput;
      try {
        twitterInput = interaction.fields.getTextInputValue('twitter_username');
      } catch {
        // Fallback to twitter_input if twitter_username doesn't exist
        twitterInput = interaction.fields.getTextInputValue('twitter_input');
      }

      if (!twitterInput || !twitterInput.trim()) {
        await interaction.editReply({
          content: '❌ Please provide a Twitter username or URL.',
          ephemeral: true
        });
        return;
      }

      // Ensure user exists in database
      globalUserQueries.upsertUser(
        client.db,
        interaction.user.id,
        interaction.user.username,
        interaction.user.discriminator
      );

      // Initiate Twitter profile linking
      const result = await profileManager.initiateTwitterLink(
        interaction.user.id,
        twitterInput.trim()
      );

      if (!result.success) {
        await interaction.editReply({
          content: `❌ ${result.error}`,
          ephemeral: true
        });
        return;
      }

      // Send verification instructions
      const instructions = result.instructions;
      await interaction.editReply({
        content: `✅ **Twitter Profile Link Initiated**\n\n` +
                 `**Step 1:** ${instructions.step1}\n` +
                 `**Step 2:** ${instructions.step2}\n` +
                 `**Step 3:** ${instructions.step3}\n` +
                 `**Step 4:** ${instructions.step4}\n\n` +
                 `⏰ Verification code expires in ${instructions.expiresIn}\n\n` +
                 `*Your verification code:* \`${result.verificationCode}\`\n\n` +
                 `After tweeting, use the \`/verify-profile\` command with your tweet URL.`,
        ephemeral: true
      });

      logger.info(`Profile verification initiated for user ${interaction.user.id} -> @${result.twitterUsername}`);
    } catch (error) {
      logger.error('Error handling profile modal submission:', error);
      await interaction.editReply({
        content: '❌ An error occurred while processing your profile. Please try again.',
        ephemeral: true
      });
    }
  }

  parseSubmission(interaction) {
    const twitterInput = interaction.fields.getTextInputValue('twitter_input');

    return {
      twitterInput: twitterInput.trim()
    };
  }
}

export default new ProfileModal();
