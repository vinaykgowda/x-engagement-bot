// ============================================================================
// FILE 6: bot/src/commands/user/my-wallet.js
// ============================================================================

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { walletQueries, globalUserQueries } from '../../database/queries.js';

export const data = new SlashCommandBuilder()
  .setName('my-wallet')
  .setDescription('View your Solana wallet information');

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Ensure user exists
    globalUserQueries.upsertUser(
      client.db,
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator
    );

    const wallet = walletQueries.getWallet(client.db, interaction.user.id);

    if (!wallet) {
      return interaction.editReply({
        content: '❌ You haven\'t set a wallet yet. Use `/set-wallet` to add one.',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Set Wallet')
              .setCustomId('open_wallet_modal')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💳')
          ),
        ],
      });
    }

    const embed = {
      color: 0x9945ff,
      title: '💳 Your Solana Wallet',
      fields: [
        {
          name: '📍 Wallet Address',
          value: `\`\`\`${wallet.wallet_address}\`\`\``,
          inline: false,
        },
        {
          name: '🔗 View on Explorer',
          value: `[Solscan](https://solscan.io/account/${wallet.wallet_address}) | [Solana Explorer](https://explorer.solana.com/address/${wallet.wallet_address})`,
          inline: false,
        },
        {
          name: '📅 Added',
          value: new Date(wallet.created_at).toLocaleDateString(),
          inline: true,
        },
        {
          name: '🔄 Last Updated',
          value: new Date(wallet.updated_at).toLocaleDateString(),
          inline: true,
        },
      ],
      footer: {
        text: '⚠️ Keep your wallet secure! Never share your private key.',
      },
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Update Wallet')
            .setCustomId('open_wallet_modal')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
        ),
      ],
    });

  } catch (error) {
    logger.error('Error fetching wallet:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch wallet information.',
    });
  }
}