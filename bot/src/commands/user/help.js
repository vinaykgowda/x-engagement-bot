// ============================================================================
// FILE: bot/src/commands/user/help.js
// ============================================================================

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show bot commands and help information')
  .addStringOption(option =>
    option.setName('category')
      .setDescription('Show commands for a specific category')
      .addChoices(
        { name: 'User Commands', value: 'user' },
        { name: 'Admin Commands', value: 'admin' },
        { name: 'Getting Started', value: 'start' }
      ));

export async function execute(interaction, client) {
  const category = interaction.options.getString('category');

  if (category === 'user') {
    return sendUserCommands(interaction);
  } else if (category === 'admin') {
    return sendAdminCommands(interaction);
  } else if (category === 'start') {
    return sendGettingStarted(interaction);
  } else {
    return sendMainHelp(interaction);
  }
}

function sendMainHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#1da1f2')
    .setTitle('🤖 X Engagement Bot - Help')
    .setDescription('Welcome to the X Engagement Bot! This bot helps you earn rewards by engaging with tweets and participating in raids.')
    .addFields(
      {
        name: '👤 User Commands',
        value: 'Commands available to all users\n`/help category:user` to see more',
        inline: false,
      },
      {
        name: '🔧 Admin Commands',
        value: 'Commands for server administrators\n`/help category:admin` to see more',
        inline: false,
      },
      {
        name: '🚀 Getting Started',
        value: 'New to the bot? Start here!\n`/help category:start` to see setup guide',
        inline: false,
      },
      {
        name: '📚 Full Documentation',
        value: 'Check out our detailed command reference in the bot repository',
        inline: false,
      },
      {
        name: '🔗 Quick Links',
        value: '• `/set-profile` - Link your Twitter account\n' +
               '• `/my-profile` - View your profile\n' +
               '• `/my-points` - Check your points\n' +
               '• `/leaderboard` - View server rankings',
        inline: false,
      }
    )
    .setFooter({ text: 'Use /help category:<name> for detailed command lists' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

function sendUserCommands(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#1da1f2')
    .setTitle('👤 User Commands')
    .setDescription('Commands available to all server members')
    .addFields(
      {
        name: '**Profile Management**',
        value: '`/set-profile` - Link your Twitter/X account\n' +
               '`/verify-profile <tweet-url>` - Verify your Twitter with a tweet\n' +
               '`/my-profile` - View your profile and stats\n' +
               '`/unlink-profile` - Unlink your Twitter account\n' +
               '`/set-wallet` - Link your Solana wallet\n' +
               '`/my-wallet` - View your wallet info',
        inline: false,
      },
      {
        name: '**Points & Rewards**',
        value: '`/my-points` - Check your points balance\n' +
               '`/leaderboard` - View server rankings\n' +
               '`/claim-reward` - Spend points on rewards',
        inline: false,
      },
      {
        name: '**Utility**',
        value: '`/ping` - Check bot status\n' +
               '`/help` - Show this help menu',
        inline: false,
      }
    )
    .setFooter({ text: 'Tip: Complete engagements and raids to earn points!' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

function sendAdminCommands(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#ff6b6b')
    .setTitle('🔧 Admin Commands')
    .setDescription('Commands for server administrators (requires Administrator permission)')
    .addFields(
      {
        name: '**Initial Setup**',
        value: '`/setup-raid` - Configure raid channels and settings',
        inline: false,
      },
      {
        name: '**Engagement Campaigns**',
        value: '`/post-engagement` - Create tweet engagement campaigns\n' +
               '`/set-expiration` - Update campaign expiration\n' +
               '`/view-stats` - View engagement statistics',
        inline: false,
      },
      {
        name: '**Rewards & Points**',
        value: '`/set-rewards` - Create claimable rewards\n' +
               '`/set-raid-rewards` - Set role-based raid rewards\n' +
               '`/set-points` - Set default point values',
        inline: false,
      },
      {
        name: '**Configuration**',
        value: '`/set-tweet-limit` - Set raid tweet frequency limits',
        inline: false,
      }
    )
    .setFooter({ text: 'Run /setup-raid first to get started!' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

function sendGettingStarted(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🚀 Getting Started Guide')
    .setDescription('Follow these steps to get started with the X Engagement Bot')
    .addFields(
      {
        name: '**For Users:**',
        value: '**1.** Use `/set-profile` to link your Twitter/X account\n' +
               '**2.** Post the verification tweet and use `/verify-profile` with the tweet URL\n' +
               '**3.** Optionally use `/set-wallet` to link your Solana wallet for crypto rewards\n' +
               '**4.** Participate in engagements and raids to earn points\n' +
               '**5.** Use `/claim-reward` to redeem your points',
        inline: false,
      },
      {
        name: '**For Admins:**',
        value: '**1.** Run `/setup-raid` to configure channels and settings\n' +
               '**2.** Create rewards with `/set-rewards`\n' +
               '**3.** Post engagement campaigns with `/post-engagement`\n' +
               '**4.** Set role rewards with `/set-raid-rewards` (optional)\n' +
               '**5.** Monitor with `/view-stats`',
        inline: false,
      },
      {
        name: '**Need Help?**',
        value: 'Use `/help` to see all available commands\n' +
               'Check your profile with `/my-profile`\n' +
               'View points with `/my-points`',
        inline: false,
      }
    )
    .setFooter({ text: 'Have fun earning rewards!' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
