// ============================================================================
// FILE 1: bot/src/commands/superadmin/generate-code.js
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';
import { nanoid } from 'nanoid';
import settings from '../../config/settings.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('generate-code')
  .setDescription('[Super Admin] Generate access code for new servers')
  .addIntegerOption(option =>
    option.setName('expires-in')
      .setDescription('Code expires in X days (0 = never expires)')
      .setMinValue(0)
      .setMaxValue(365));

export async function execute(interaction, client) {
  // Check if user is super admin
  if (interaction.user.id !== settings.superAdmin.userId) {
    return interaction.reply({
      content: '❌ This command is restricted to the super administrator.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const expiresInDays = interaction.options.getInteger('expires-in') || 30;

    // Generate unique code
    const code = nanoid(12).toUpperCase();
    const now = Date.now();
    const expiresAt = expiresInDays > 0 ? now + (expiresInDays * 24 * 60 * 60 * 1000) : null;

    // Insert code into database
    client.db.prepare(`
      INSERT INTO server_access_codes (
        code, generated_by, is_used, expires_at, created_at
      ) VALUES (?, ?, 0, ?, ?)
    `).run(code, interaction.user.id, expiresAt, now);

    logger.info(`Access code generated: ${code} by ${interaction.user.id}`);

    const embed = {
      color: 0x00ff00,
      title: '✅ Access Code Generated',
      description: 'Share this code with server owners to allow them to use the bot.',
      fields: [
        {
          name: '🔑 Access Code',
          value: `\`\`\`${code}\`\`\``,
          inline: false,
        },
        {
          name: '📅 Expires',
          value: expiresAt
            ? new Date(expiresAt).toLocaleString()
            : 'Never',
          inline: true,
        },
        {
          name: '📊 Status',
          value: 'Unused',
          inline: true,
        },
      ],
      footer: {
        text: 'Server owners can use this code when setting up the bot',
      },
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error generating code:', error);
    await interaction.editReply({
      content: '❌ Failed to generate access code.',
    });
  }
}