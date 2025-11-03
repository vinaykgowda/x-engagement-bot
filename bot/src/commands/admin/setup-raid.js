// ============================================================================
// FILE 7: bot/src/commands/admin/setup-raid.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup-raid')
  .setDescription('Setup raid channels and configuration')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option.setName('post-channel')
      .setDescription('Channel where users post their tweets')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText))
  .addChannelOption(option =>
    option.setName('raid-channel')
      .setDescription('Channel where raid tweets are posted')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText))
  .addIntegerOption(option =>
    option.setName('default-points')
      .setDescription('Default points per raid tweet')
      .setMinValue(1)
      .setMaxValue(1000))
  .addIntegerOption(option =>
    option.setName('frequency-hours')
      .setDescription('Hours between allowed tweets (default: 24)')
      .setMinValue(1)
      .setMaxValue(168));

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const postChannel = interaction.options.getChannel('post-channel');
    const raidChannel = interaction.options.getChannel('raid-channel');
    const defaultPoints = interaction.options.getInteger('default-points') || 50;
    const frequencyHours = interaction.options.getInteger('frequency-hours') || 24;

    const now = Date.now();

    // Upsert raid config
    client.db.prepare(`
      INSERT INTO server_raid_config (
        guild_id, raid_channel_id, raid_post_channel_id,
        default_raid_points, tweet_frequency_hours,
        auto_rewards_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        raid_channel_id = excluded.raid_channel_id,
        raid_post_channel_id = excluded.raid_post_channel_id,
        default_raid_points = excluded.default_raid_points,
        tweet_frequency_hours = excluded.tweet_frequency_hours,
        updated_at = excluded.updated_at
    `).run(
      interaction.guildId,
      postChannel.id,
      raidChannel.id,
      defaultPoints,
      frequencyHours,
      now,
      now
    );

    logger.info(`Raid setup configured for guild ${interaction.guildId}`);

    await interaction.editReply({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Raid Setup Complete',
        fields: [
          { name: '📝 Post Channel', value: `<#${postChannel.id}>`, inline: true },
          { name: '🎯 Raid Channel', value: `<#${raidChannel.id}>`, inline: true },
          { name: '🎁 Default Points', value: defaultPoints.toString(), inline: true },
          { name: '⏰ Frequency', value: `${frequencyHours} hours`, inline: true },
        ],
        description: 'Users can now post their tweets in the post channel!',
        timestamp: new Date().toISOString(),
      }],
    });

  } catch (error) {
    logger.error('Error setting up raid:', error);
    await interaction.editReply('❌ Failed to setup raid configuration.');
  }
}
