import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import WalletManager from '../../handlers/rewards/walletManager.js';
import { globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

class WalletModal {
  createModal() {
    const modal = new ModalBuilder()
      .setCustomId('wallet_modal')
      .setTitle('Link Solana Wallet');

    const walletInput = new TextInputBuilder()
      .setCustomId('wallet_input')
      .setLabel('Solana Wallet Address')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your Solana wallet address')
      .setRequired(true)
      .setMinLength(32)
      .setMaxLength(44);

    const row = new ActionRowBuilder().addComponents(walletInput);
    modal.addComponents(row);

    return modal;
  }

  async execute(interaction, client) {
    try {
      // Get the wallet address from the modal submission
      // Note: The field customId varies - commands use 'wallet_address', button modals might use 'wallet_input'
      let walletAddress;
      try {
        walletAddress = interaction.fields.getTextInputValue('wallet_address');
      } catch {
        // Fallback to wallet_input if wallet_address doesn't exist
        walletAddress = interaction.fields.getTextInputValue('wallet_input');
      }

      if (!walletAddress || !walletAddress.trim()) {
        await interaction.editReply({
          content: '❌ Please provide a valid Solana wallet address.',
          ephemeral: true
        });
        return;
      }

      walletAddress = walletAddress.trim();

      // Validate wallet address format
      if (!this.validateWalletAddress(walletAddress)) {
        await interaction.editReply({
          content: '❌ Invalid Solana wallet address format. Please provide a valid Base58 address (32-44 characters).',
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

      // Set wallet using WalletManager
      const walletManager = new WalletManager(client.db);

      try {
        const result = walletManager.setWallet(interaction.user.id, walletAddress);

        await interaction.editReply({
          content: `✅ **Wallet Successfully Linked!**\n\n` +
                   `**Wallet Address:** \`${result.walletAddress}\`\n\n` +
                   `You can now receive rewards to this wallet.`,
          ephemeral: true
        });

        logger.info(`Wallet set for user ${interaction.user.id}: ${result.walletAddress}`);
      } catch (error) {
        // Handle specific wallet errors
        if (error.message.includes('already linked')) {
          await interaction.editReply({
            content: '❌ This wallet address is already linked to another Discord account.',
            ephemeral: true
          });
        } else if (error.message.includes('Invalid')) {
          await interaction.editReply({
            content: '❌ Invalid Solana wallet address. Please check and try again.',
            ephemeral: true
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error handling wallet modal submission:', error);
      await interaction.editReply({
        content: '❌ An error occurred while setting your wallet. Please try again.',
        ephemeral: true
      });
    }
  }

  parseSubmission(interaction) {
    const walletAddress = interaction.fields.getTextInputValue('wallet_input');

    return {
      walletAddress: walletAddress.trim()
    };
  }

  validateWalletAddress(address) {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  }
}

export default new WalletModal();
