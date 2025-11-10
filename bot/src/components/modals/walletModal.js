import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

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
