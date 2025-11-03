// ============================================================================
// FILE 8: bot/src/commands/user/ping.js (Already created, but included for completeness)
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency and status');

export async function execute(interaction, client) {
  const sent = await interaction.reply({
    content: '🏓 Pinging...',
    fetchReply: true,
  });

  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(client.ws.ping);

  await interaction.editReply({
    content:
      `🏓 **Pong!**\n` +
      `📡 Latency: **${latency}ms**\n` +
      `💓 API Latency: **${apiLatency}ms**\n` +
      `✅ Status: **Online**`,
  });
}