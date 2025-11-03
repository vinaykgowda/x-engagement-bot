// ============================================================================
// FILE 4: bot/src/commands/admin/set-rewards.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('set-rewards')
  .setDescription('Configure point rewards')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Reward name')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('points-cost')
      .setDescription('Points required to claim')
      .setRequired(true)
      .setMinValue(1))
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Reward type')
      .setRequired(true)
      .addChoices(
        { name: 'SOL', value: 'sol' },
        { name: 'Token', value: 'token' },
        { name: 'Role', value: 'role' }
      ))
  .addNumberOption(option =>
    option.setName('amount')
      .setDescription('Amount of SOL/Token (for SOL/Token type)')
      .setMinValue(0.001))
  .addRoleOption(option =>
    option.setName('role')
      .setDescription('Role to assign (for Role type)'))
  .addStringOption(option =>
    option.setName('description')
      .setDescription('Reward description'));

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const name = interaction.options.getString('name');
    const pointsCost = interaction.options.getInteger('points-cost');
    const type = interaction.options.getString('type');
    const amount = interaction.options.getNumber('amount');
    const role = interaction.options.getRole('role');
    const description = interaction.options.getString('description');

    // Validation
    if (type === 'sol' && !amount) {
      return interaction.editReply('❌ SOL rewards require an amount.');
    }

    if (type === 'token' && !amount) {
      return interaction.editReply('❌ Token rewards require an amount.');
    }

    if (type === 'role' && !role) {
      return interaction.editReply('❌ Role rewards require a role.');
    }

    // Insert reward into database
    const now = Date.now();
    client.db.prepare(`
      INSERT INTO server_rewards (
        guild_id, name, description, points_cost,
        reward_type, reward_amount, role_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      interaction.guildId,
      name,
      description || null,
      pointsCost,
      type,
      amount || null,
      role?.id || null,
      now
    );

    logger.info(`Reward created: ${name} (${pointsCost} pts) in guild ${interaction.guildId}`);

    await interaction.editReply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Reward Created',
        fields: [
          { name: 'Name', value: name, inline: true },
          { name: 'Cost', value: `${pointsCost} points`, inline: true },
          { name: 'Type', value: type.toUpperCase(), inline: true },
          ...(amount ? [{ name: 'Amount', value: amount.toString(), inline: true }] : []),
          ...(role ? [{ name: 'Role', value: role.name, inline: true }] : []),
          ...(description ? [{ name: 'Description', value: description }] : []),
        ],
        timestamp: new Date().toISOString(),
      }],
    });

  } catch (error) {
    logger.error('Error creating reward:', error);
    await interaction.editReply('❌ Failed to create reward.');
  }
}