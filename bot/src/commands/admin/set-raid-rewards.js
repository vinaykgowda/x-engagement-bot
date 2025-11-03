// ============================================================================
// FILE 8: bot/src/commands/admin/set-raid-rewards.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('set-raid-rewards')
  .setDescription('Set raid rewards based on user role')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addRoleOption(option =>
    option.setName('role')
      .setDescription('Role to set reward for')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reward-type')
      .setDescription('Type of reward')
      .setRequired(true)
      .addChoices(
        { name: 'SOL', value: 'sol' },
        { name: 'Token', value: 'token' },
        { name: 'Points', value: 'points' }
      ))
  .addNumberOption(option =>
    option.setName('amount')
      .setDescription('Reward amount')
      .setRequired(true)
      .setMinValue(0.001));

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const role = interaction.options.getRole('role');
    const rewardType = interaction.options.getString('reward-type');
    const amount = interaction.options.getNumber('amount');

    const now = Date.now();

    // Insert or update role reward
    client.db.prepare(`
      INSERT INTO server_raid_role_rewards (
        guild_id, role_id, reward_type, reward_amount, created_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, role_id) DO UPDATE SET
        reward_type = excluded.reward_type,
        reward_amount = excluded.reward_amount
    `).run(
      interaction.guildId,
      role.id,
      rewardType,
      amount,
      now
    );

    logger.info(`Raid role reward set for ${role.name} in guild ${interaction.guildId}`);

    await interaction.editReply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Role Reward Set',
        fields: [
          { name: '👥 Role', value: role.name, inline: true },
          { name: '🎁 Type', value: rewardType.toUpperCase(), inline: true },
          { name: '💰 Amount', value: amount.toString(), inline: true },
        ],
        description: `Users with the ${role.name} role will receive **${amount} ${rewardType}** per raid tweet.`,
        timestamp: new Date().toISOString(),
      }],
    });

  } catch (error) {
    logger.error('Error setting raid reward:', error);
    await interaction.editReply('❌ Failed to set raid reward.');
  }
}
