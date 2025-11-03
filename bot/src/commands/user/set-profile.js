// ============================================================================
// FILE 1: bot/src/commands/user/set-profile.js
// ============================================================================

import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { globalUserQueries, twitterQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('set-profile')
  .setDescription('Link your Twitter/X profile');

export async function execute(interaction, client) {
  // Create modal for Twitter profile input
  const modal = new ModalBuilder()
    .setCustomId('profile_modal')
    .setTitle('Link Your Twitter Profile');

  const twitterInput = new TextInputBuilder()
    .setCustomId('twitter_username')
    .setLabel('Twitter Username or URL')
    .setPlaceholder('@username or https://twitter.com/username')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder().addComponents(twitterInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}