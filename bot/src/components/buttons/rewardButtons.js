const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../../../database/queries');
const logger = require('../../../config/logger');

class RewardButtons {
  createRewardButtons(rewards) {
    const buttons = rewards.slice(0, 5).map(reward => 
      new ButtonBuilder()
        .setCustomId(`claim_reward_${reward.id}`)
        .setLabel(`${reward.name} (${reward.points_cost} pts)`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(false)
    );

    return new ActionRowBuilder().addComponents(buttons);
  }

  createClaimButton(rewardId) {
    const button = new ButtonBuilder()
      .setCustomId(`claim_reward_${rewardId}`)
      .setLabel('Claim Reward')
      .setStyle(ButtonStyle.Success);

    return new ActionRowBuilder().addComponents(button);
  }

  createViewRewardsButton() {
    const button = new ButtonBuilder()
      .setCustomId('view_rewards')
      .setLabel('🎁 View Rewards')
      .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder().addComponents(button);
  }

  async handleClaimReward(interaction, rewardId) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      const reward = db.connection.prepare(
        'SELECT * FROM server_rewards WHERE id = ? AND guild_id = ?'
      ).get(rewardId, guildId);

      if (!reward) {
        return interaction.editReply('❌ Reward not found');
      }

      if (!reward.is_active) {
        return interaction.editReply('❌ This reward is no longer available');
      }

      const userPoints = db.pointsQueries.getPoints(db.connection, userId, guildId);

      if (!userPoints || userPoints.available_points < reward.points_cost) {
        return interaction.editReply(
          `❌ Insufficient points. You need ${reward.points_cost} points but have ${userPoints?.available_points || 0}`
        );
      }

      const spendResult = db.pointsQueries.spendPoints(
        db.connection,
        userId,
        guildId,
        reward.points_cost
      );

      if (spendResult.changes === 0) {
        return interaction.editReply('❌ Failed to spend points. Please try again.');
      }

      db.rewardQueries.createRewardClaim(
        db.connection,
        rewardId,
        userId,
        guildId,
        reward.points_cost,
        reward.reward_type,
        reward.reward_amount
      );

      await this.processReward(interaction, reward, userId);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Reward Claimed!')
        .setDescription(`You have successfully claimed: **${reward.name}**`)
        .addFields(
          { name: 'Cost', value: `${reward.points_cost} points`, inline: true },
          { name: 'Remaining Points', value: `${userPoints.available_points - reward.points_cost}`, inline: true }
        )
        .setTimestamp();

      if (reward.reward_type === 'role' && reward.role_id) {
        embed.addFields({
          name: '🎭 Role',
          value: `<@&${reward.role_id}> has been assigned to you`
        });
      }

      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error handling reward claim:', error);
      return interaction.editReply('❌ An error occurred while claiming the reward');
    }
  }

  async processReward(interaction, reward, userId) {
    try {
      if (reward.reward_type === 'role' && reward.role_id) {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(reward.role_id);
        logger.info(`Role ${reward.role_id} assigned to user ${userId}`);
      }

      if (reward.reward_type === 'token' && reward.reward_amount) {
        logger.info(`Token reward of ${reward.reward_amount} pending for user ${userId}`);
      }

    } catch (error) {
      logger.error('Error processing reward:', error);
      throw error;
    }
  }

  parseRewardId(customId) {
    const parts = customId.split('_');
    return parts[parts.length - 1];
  }

  createRewardEmbed(reward, userPoints) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎁 ${reward.name}`)
      .setDescription(reward.description || 'No description available')
      .addFields(
        { name: '💰 Cost', value: `${reward.points_cost} points`, inline: true },
        { name: '📊 Your Points', value: `${userPoints} points`, inline: true },
        { name: '✅ Can Afford', value: userPoints >= reward.points_cost ? 'Yes' : 'No', inline: true }
      );

    if (reward.reward_type === 'role' && reward.role_id) {
      embed.addFields({ name: '🎭 Type', value: 'Discord Role' });
    } else if (reward.reward_type === 'token') {
      embed.addFields({ 
        name: '💎 Type', 
        value: `${reward.reward_amount} Tokens` 
      });
    }

    return embed;
  }

  createRewardListEmbed(rewards, userPoints) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎁 Available Rewards')
      .setDescription(`Your points: **${userPoints}**`)
      .setTimestamp();

    if (rewards.length === 0) {
      embed.addFields({ name: 'No Rewards', value: 'No rewards are currently available' });
      return embed;
    }

    const rewardList = rewards.map(reward => {
      const affordable = userPoints >= reward.points_cost ? '✅' : '❌';
      return `${affordable} **${reward.name}** - ${reward.points_cost} points`;
    }).join('\n');

    embed.setDescription(`Your points: **${userPoints}**\n\n${rewardList}`);

    return embed;
  }
}

module.exports = new RewardButtons();
