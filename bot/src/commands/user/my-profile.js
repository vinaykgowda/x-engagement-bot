// ============================================================================
// FILE 2: bot/src/commands/user/my-profile.js
// ============================================================================

import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { globalUserQueries, twitterQueries, walletQueries } from '../../database/queries.js';

export const data = new SlashCommandBuilder()
  .setName('my-profile')
  .setDescription('View and edit your profile');

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Ensure user exists in global_users
    globalUserQueries.upsertUser(
      client.db,
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator
    );

    // Get user profile data
    const userProfile = globalUserQueries.getUserWithTwitter(client.db, interaction.user.id);
    const wallet = walletQueries.getWallet(client.db, interaction.user.id);

    // Build profile embed
    const embed = {
      color: 0x1da1f2,
      title: `👤 ${interaction.user.username}'s Profile`,
      thumbnail: {
        url: interaction.user.displayAvatarURL(),
      },
      fields: [],
      timestamp: new Date().toISOString(),
    };

    // Add Twitter profile info
    if (userProfile?.twitter_username) {
      embed.fields.push({
        name: '🐦 Twitter Profile',
        value: `[@${userProfile.twitter_username}](${userProfile.twitter_url})\n${userProfile.twitter_verified ? '✅ Verified' : '⚠️ Not verified'}`,
        inline: false,
      });
    } else {
      embed.fields.push({
        name: '🐦 Twitter Profile',
        value: '❌ Not linked\nUse `/set-profile` to link your Twitter',
        inline: false,
      });
    }

    // Add wallet info
    if (wallet) {
      embed.fields.push({
        name: '💳 Solana Wallet',
        value: `\`${wallet.wallet_address.slice(0, 8)}...${wallet.wallet_address.slice(-8)}\``,
        inline: false,
      });
    } else {
      embed.fields.push({
        name: '💳 Solana Wallet',
        value: '❌ Not set\nUse `/set-wallet` to add your wallet',
        inline: false,
      });
    }

    // Add account info
    embed.fields.push(
      {
        name: '📅 Account Created',
        value: new Date(userProfile.created_at).toLocaleDateString(),
        inline: true,
      },
      {
        name: '🔄 Last Updated',
        value: new Date(userProfile.updated_at).toLocaleDateString(),
        inline: true,
      }
    );

    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          {
            type: 2,
            style: 1,
            label: '🐦 Update Twitter',
            custom_id: 'update_twitter',
          },
          {
            type: 2,
            style: 1,
            label: '💳 Update Wallet',
            custom_id: 'update_wallet',
          }
        ),
      ],
    });

  } catch (error) {
    logger.error('Error showing profile:', error);
    await interaction.editReply({
      content: '❌ Failed to load your profile.',
    });
  }
}