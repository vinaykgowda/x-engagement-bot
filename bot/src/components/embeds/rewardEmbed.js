const { EmbedBuilder } = require('discord.js');

class RewardEmbed {
  create(reward, userPoints) {
    const canAfford = userPoints >= reward.points_cost;
    
    const embed = new EmbedBuilder()
      .setColor(canAfford ? '#00FF00' : '#FFA500')
      .setTitle(`🎁 ${reward.name}`)
      .setDescription(reward.description || 'No description available')
      .addFields(
        { name: '💰 Cost', value: `${reward.points_cost} points`, inline: true },
        { name: '📊 Your Points', value: `${userPoints} points`, inline: true },
        { name: '✅ Status', value: canAfford ? 'Can Afford' : 'Not Enough Points', inline: true }
      )
      .setTimestamp();

    if (reward.reward_type === 'role' && reward.role_id) {
      embed.addFields({
        name: '🎭 Reward Type',
        value: `Discord Role: <@&${reward.role_id}>`,
        inline: false
      });
    } else if (reward.reward_type === 'token') {
      embed.addFields({
        name: '💎 Reward Type',
        value: `${reward.reward_amount} Tokens`,
        inline: false
      });
    }

    return embed;
  }

  createListEmbed(rewards, userPoints) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎁 Available Rewards')
      .setDescription(`Your points: **${userPoints}**`)
      .setTimestamp();

    if (rewards.length === 0) {
      embed.addFields({ name: 'No Rewards', value: 'No rewards are currently available' });
      return embed;
    }

    rewards.forEach((reward, index) => {
      const canAfford = userPoints >= reward.points_cost;
      const status = canAfford ? '✅' : '❌';
      
      let type = '';
      if (reward.reward_type === 'role') {
        type = '🎭 Role';
      } else if (reward.reward_type === 'token') {
        type = `💎 ${reward.reward_amount} Tokens`;
      }

      embed.addFields({
        name: `${status} ${reward.name}`,
        value: `Cost: ${reward.points_cost} points | ${type}`,
        inline: false
      });
    });

    embed.setFooter({ text: `${rewards.length} reward(s) available` });

    return embed;
  }

  createClaimSuccessEmbed(reward, remainingPoints) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Reward Claimed!')
      .setDescription(`You have successfully claimed: **${reward.name}**`)
      .addFields(
        { name: '💰 Cost', value: `${reward.points_cost} points`, inline: true },
        { name: '💵 Remaining', value: `${remainingPoints} points`, inline: true }
      )
      .setTimestamp();

    if (reward.reward_type === 'role' && reward.role_id) {
      embed.addFields({
        name: '🎭 Role Assigned',
        value: `<@&${reward.role_id}>`,
        inline: false
      });
    } else if (reward.reward_type === 'token') {
      embed.addFields({
        name: '💎 Tokens',
        value: `${reward.reward_amount} tokens will be sent to your wallet`,
        inline: false
      });
    }

    return embed;
  }

  createClaimHistoryEmbed(claims, username) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎁 ${username}'s Reward History`)
      .setTimestamp();

    if (!claims || claims.length === 0) {
      embed.setDescription('No rewards claimed yet.');
      return embed;
    }

    claims.forEach((claim, index) => {
      const status = claim.status === 'pending' ? '⏳' : claim.status === 'completed' ? '✅' : '❌';
      const date = new Date(claim.claimed_at).toLocaleDateString();
      
      embed.addFields({
        name: `${status} Reward #${index + 1}`,
        value: `Type: ${claim.reward_type}\nPoints: ${claim.points_spent}\nDate: ${date}`,
        inline: true
      });
    });

    embed.setFooter({ text: `${claims.length} reward(s) claimed` });

    return embed;
  }

  createRewardDetailsEmbed(reward) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎁 ${reward.name}`)
      .setDescription(reward.description || 'No description available')
      .addFields(
        { name: '💰 Cost', value: `${reward.points_cost} points`, inline: true },
        { name: '🎯 Type', value: reward.reward_type, inline: true }
      )
      .setTimestamp();

    if (reward.reward_type === 'role' && reward.role_id) {
      embed.addFields({
        name: '🎭 Discord Role',
        value: `<@&${reward.role_id}>`,
        inline: false
      });
    } else if (reward.reward_type === 'token' && reward.reward_amount) {
      embed.addFields({
        name: '💎 Token Amount',
        value: `${reward.reward_amount}`,
        inline: false
      });
    }

    return embed;
  }
}

module.exports = new RewardEmbed();
