import { EmbedBuilder } from 'discord.js';
import profileManager from '../../handlers/profile/profileManager.js';
import logger from '../../config/logger.js';

class ProfileButtons {
  async execute(interaction, client, action) {
    if (action === 'confirm_unlink_profile') {
      return this.handleConfirmUnlink(interaction);
    } else if (action === 'cancel_unlink_profile') {
      return this.handleCancelUnlink(interaction);
    }
  }

  async handleConfirmUnlink(interaction) {
    try {
      await interaction.deferUpdate();

      const result = await profileManager.unlinkTwitterProfile(interaction.user.id);

      if (!result.success) {
        await interaction.editReply({
          content: `❌ ${result.error}`,
          embeds: [],
          components: [],
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Profile Unlinked')
        .setDescription(`Your Twitter account **@${result.previousUsername}** has been unlinked from your Discord account.`)
        .addFields({
          name: '📝 Next Steps',
          value: 'You can link a new Twitter account anytime using `/set-profile`',
          inline: false,
        })
        .setTimestamp();

      await interaction.editReply({
        content: null,
        embeds: [embed],
        components: [],
      });

      logger.info(`Profile unlinked: ${interaction.user.id} (was @${result.previousUsername})`);

    } catch (error) {
      logger.error('Error unlinking profile:', error);
      await interaction.editReply({
        content: '❌ An error occurred while unlinking your profile. Please try again.',
        embeds: [],
        components: [],
      });
    }
  }

  async handleCancelUnlink(interaction) {
    try {
      await interaction.update({
        content: '❌ Profile unlinking cancelled.',
        embeds: [],
        components: [],
      });
    } catch (error) {
      logger.error('Error cancelling unlink:', error);
    }
  }
}

export default new ProfileButtons();
