// ============================================================================
// FILE 7: bot/src/commands/user/claim-reward.js
// ============================================================================

import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { pointsQueries, rewardQueries, globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('claim-reward')
  .setDescription('Spend points to claim rewards');

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

    // Get user's available points
    const userPoints = pointsQueries.getPoints(
      client.db,
      interaction.user.id,
      interaction.guildId
    );

    const availablePoints = userPoints?.available_points || 0;

    if (availablePoints === 0) {
      return interaction.editReply({
        content: '❌ You don\'t have any points to spend. Complete engagements to earn points!',
      });
    }

    // Get available rewards
    const rewards = rewardQueries.getAvailableRewards(
      client.db,
      interaction.guildId,
      availablePoints
    );

    if (rewards.length === 0) {
      return interaction.editReply({
        content: `💰 You have **${availablePoints} points** but there are no rewards you can afford yet.\n\nKeep earning points to unlock rewards!`,
      });
    }

    // Create select menu for rewards
    const options = rewards.map(reward => {
      let description = `Cost: ${reward.points_cost} points`;

      if (reward.reward_type === 'sol') {
        description += ` | ${reward.reward_amount} SOL`;
      } else if (reward.reward_type === 'token') {
        description += ` | ${reward.reward_amount} tokens`;
      } else if (reward.reward_type === 'role') {
        description += ` | Role reward`;
      }

      return {
        label: reward.name,
        value: reward.id.toString(),
        description: description.slice(0, 100),
        emoji: reward.reward_type === 'sol' ? '💰' : reward.reward_type === 'token' ? '🪙' : '🎭',
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_reward')
      .setPlaceholder('Choose a reward to claim')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = {
      color: 0xffd700,
      title: '🎁 Available Rewards',
      description: `You have **${availablePoints} points** to spend!`,
      fields: rewards.map(reward => ({
        name: `${reward.name} - ${reward.points_cost} points`,
        value: reward.description || 'No description',
        inline: false,
      })),
      footer: {
        text: 'Select a reward from the menu below',
      },
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

  } catch (error) {
    logger.error('Error showing rewards:', error);
    await interaction.editReply({
      content: '❌ Failed to load rewards.',
    });
  }
}