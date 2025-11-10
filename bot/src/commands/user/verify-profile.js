// ============================================================================
// FILE: bot/src/commands/user/verify-profile.js
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';
import profileManager from '../../handlers/profile/profileManager.js';
import { globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('verify-profile')
  .setDescription('Verify your Twitter profile with a tweet URL')
  .addStringOption(option =>
    option.setName('tweet-url')
      .setDescription('URL of your verification tweet')
      .setRequired(true));

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const tweetUrl = interaction.options.getString('tweet-url');

    // Ensure user exists in database
    globalUserQueries.upsertUser(
      client.db,
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator
    );

    // Check if user has a pending verification
    const pending = profileManager.getPendingVerification(interaction.user.id);

    if (!pending) {
      await interaction.editReply({
        content: '❌ No pending verification found.\n\n' +
                 'Please start by using `/set-profile` to initiate the verification process.',
      });
      return;
    }

    // Verify the tweet
    const result = await profileManager.verifyTwitterLink(
      interaction.user.id,
      tweetUrl
    );

    if (!result.success) {
      await interaction.editReply({
        content: `❌ ${result.error}\n\n` +
                 `If your verification code expired, please use \`/set-profile\` again to get a new code.`,
      });
      return;
    }

    // Success!
    await interaction.editReply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Twitter Profile Verified!',
        description: `Your Twitter account **@${result.twitterUsername}** has been successfully linked to your Discord account.`,
        fields: [
          {
            name: '🐦 Twitter Account',
            value: `[@${result.twitterUsername}](https://x.com/${result.twitterUsername})`,
            inline: true,
          },
          {
            name: '✅ Status',
            value: result.verified ? 'Verified' : 'Pending',
            inline: true,
          },
        ],
        footer: {
          text: 'You can now participate in engagements and raids!',
        },
        timestamp: new Date().toISOString(),
      }],
    });

    logger.info(`Twitter profile verified: ${interaction.user.id} -> @${result.twitterUsername}`);

  } catch (error) {
    logger.error('Error executing verify-profile command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while verifying your profile. Please try again.',
    });
  }
}
