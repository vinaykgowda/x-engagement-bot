// ============================================================================
// FILE 2: bot/src/events/interactionCreate.js
// ============================================================================

import { Events } from 'discord.js';
import logger from '../config/logger.js';

export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommand(client, interaction);
    }

    // Handle button interactions
    else if (interaction.isButton()) {
      await handleButton(client, interaction);
    }

    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      await handleModal(client, interaction);
    }

    // Handle select menus
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(client, interaction);
    }
  },
};

async function handleCommand(client, interaction) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    return;
  }

  try {
    logger.command(
      interaction.commandName,
      interaction.user.id,
      interaction.guildId
    );

    await command.execute(interaction, client);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);

    const errorMessage = {
      content: '❌ There was an error executing this command!',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

async function handleButton(client, interaction) {
  try {
    const [action, ...params] = interaction.customId.split(':');

    logger.info(`Button clicked: ${action} by ${interaction.user.id}`);

    switch (action) {
      case 'check_engagement':
        await handleCheckEngagement(client, interaction, params[0]);
        break;

      case 'update_twitter':
      case 'open_wallet_modal':
        await handleOpenModal(client, interaction, action);
        break;

      case 'update_wallet':
        await handleOpenModal(client, interaction, 'wallet');
        break;

      default:
        logger.warn(`Unknown button action: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling button interaction:', error);

    const errorMessage = {
      content: '❌ An error occurred while processing your request.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

async function handleModal(client, interaction) {
  try {
    const [action] = interaction.customId.split(':');

    logger.info(`Modal submitted: ${action} by ${interaction.user.id}`);

    switch (action) {
      case 'profile_modal':
        await handleProfileSubmit(client, interaction);
        break;

      case 'wallet_modal':
        await handleWalletSubmit(client, interaction);
        break;

      case 'comment_modal':
        await handleCommentSubmit(client, interaction);
        break;

      default:
        logger.warn(`Unknown modal action: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling modal submission:', error);

    const errorMessage = {
      content: '❌ An error occurred while processing your submission.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

async function handleSelectMenu(client, interaction) {
  try {
    const [action] = interaction.customId.split(':');

    logger.info(`Select menu: ${action} by ${interaction.user.id}`);

    switch (action) {
      case 'select_reward':
        await handleRewardSelection(client, interaction);
        break;

      default:
        logger.warn(`Unknown select menu action: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling select menu:', error);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true,
    });
  }
}

// Button handler implementations
async function handleCheckEngagement(client, interaction, engagementId) {
  await interaction.deferReply({ ephemeral: true });

  const { default: checkEngagementHandler } = await import('../components/buttons/checkButton.js');
  await checkEngagementHandler.execute(interaction, client, engagementId);
}

async function handleOpenModal(client, interaction, type) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');

  if (type === 'update_twitter' || type === 'profile') {
    const modal = new ModalBuilder()
      .setCustomId('profile_modal')
      .setTitle('Update Twitter Profile');

    const input = new TextInputBuilder()
      .setCustomId('twitter_username')
      .setLabel('Twitter Username or URL')
      .setPlaceholder('@username or https://twitter.com/username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  } else if (type === 'wallet' || type === 'open_wallet_modal') {
    const modal = new ModalBuilder()
      .setCustomId('wallet_modal')
      .setTitle('Set Solana Wallet');

    const input = new TextInputBuilder()
      .setCustomId('wallet_address')
      .setLabel('Solana Wallet Address')
      .setPlaceholder('Enter your Solana wallet address')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(32)
      .setMaxLength(44);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }
}

// Modal handler implementations
async function handleProfileSubmit(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { default: profileModal } = await import('../components/modals/profileModal.js');
  await profileModal.execute(interaction, client);
}

async function handleWalletSubmit(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { default: walletModal } = await import('../components/modals/walletModal.js');
  await walletModal.execute(interaction, client);
}

async function handleCommentSubmit(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { default: commentModal } = await import('../components/modals/commentModal.js');
  await commentModal.execute(interaction, client);
}

// Select menu handler implementations
async function handleRewardSelection(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { default: rewardHandler } = await import('../components/buttons/rewardButtons.js');
  await rewardHandler.handleClaimReward(interaction, client);
}