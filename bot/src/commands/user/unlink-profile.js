// ============================================================================
// FILE: bot/src/commands/user/unlink-profile.js
// ============================================================================

import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import profileManager from '../../handlers/profile/profileManager.js';
import { globalUserQueries, twitterQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('unlink-profile')
  .setDescription('Unlink your Twitter/X profile from your Discord account');

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const userId = interaction.user.id;

    // Check if user has a linked profile
    const profile = twitterQueries.getProfile(client.db, userId);

    if (!profile) {
      await interaction.editReply({
        content: '❌ You don\'t have a Twitter profile linked.\n\n' +
                 'Use `/set-profile` to link your Twitter account.',
      });
      return;
    }

    // Create confirmation buttons
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_unlink_profile')
        .setLabel('Yes, Unlink')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_unlink_profile')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [{
        color: 0xff9900,
        title: '⚠️ Confirm Profile Unlinking',
        description: `Are you sure you want to unlink **@${profile.twitter_username}** from your Discord account?`,
        fields: [
          {
            name: '⚠️ Warning',
            value: 'This action will:\n' +
                   '• Remove your Twitter verification\n' +
                   '• Disable participation in engagements\n' +
                   '• Disable participation in raids\n' +
                   '• You can re-link anytime with `/set-profile`',
            inline: false,
          },
        ],
        footer: {
          text: 'Click "Yes, Unlink" to confirm',
        },
        timestamp: new Date().toISOString(),
      }],
      components: [confirmRow],
    });

  } catch (error) {
    logger.error('Error executing unlink-profile command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while processing your request. Please try again.',
    });
  }
}
