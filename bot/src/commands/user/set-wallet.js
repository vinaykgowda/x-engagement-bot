// ============================================================================
// FILE 5: bot/src/commands/user/set-wallet.js
// ============================================================================

import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { globalUserQueries } from '../../database/queries.js';

export const data = new SlashCommandBuilder()
  .setName('set-wallet')
  .setDescription('Set your Solana wallet address for rewards');

export async function execute(interaction, client) {
  // Ensure user exists
  globalUserQueries.upsertUser(
    client.db,
    interaction.user.id,
    interaction.user.username,
    interaction.user.discriminator
  );

  // Create modal for wallet input
  const modal = new ModalBuilder()
    .setCustomId('wallet_modal')
    .setTitle('Set Solana Wallet');

  const walletInput = new TextInputBuilder()
    .setCustomId('wallet_address')
    .setLabel('Solana Wallet Address')
    .setPlaceholder('Enter your Solana wallet address (Base58)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(32)
    .setMaxLength(44);

  const row = new ActionRowBuilder().addComponents(walletInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}
