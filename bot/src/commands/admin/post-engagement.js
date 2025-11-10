// ============================================================================
// FILE 2: bot/src/commands/admin/post-engagement.js
// ============================================================================

import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { engagementQueries, serverQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';

export const data = new SlashCommandBuilder()
  .setName('post-engagement')
  .setDescription('Post a tweet for users to engage with')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option.setName('tweet-url')
      .setDescription('URL of the tweet')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('points')
      .setDescription('Points to award for completion')
      .setRequired(true)
      .setMinValue(1))
  .addStringOption(option =>
    option.setName('requirements')
      .setDescription('Required actions (e.g., like+rt, like+rt+comment)')
      .setRequired(true)
      .addChoices(
        { name: 'Like', value: 'like' },
        { name: 'Like + Retweet', value: 'like+rt' },
        { name: 'Like + Retweet + Comment', value: 'like+rt+comment' },
        { name: 'Like + Retweet + Comment + Bookmark', value: 'like+rt+comment+bookmark' }
      ))
  .addIntegerOption(option =>
    option.setName('expires-in')
      .setDescription('Expires in X hours (leave empty for no expiration)')
      .setMinValue(1)
      .setMaxValue(720));

export async function execute(interaction, client) {
  await interaction.deferReply();

  try {
    const tweetUrl = interaction.options.getString('tweet-url');
    const points = interaction.options.getInteger('points');
    const requirementsStr = interaction.options.getString('requirements');
    const expiresIn = interaction.options.getInteger('expires-in');

    // Parse tweet ID from URL
    const tweetId = parseTweetId(tweetUrl);
    if (!tweetId) {
      return interaction.editReply({
        content: '❌ Invalid tweet URL. Please provide a valid Twitter/X URL.',
        ephemeral: true,
      });
    }

    // Parse requirements
    const requirements = {
      like: requirementsStr.includes('like'),
      retweet: requirementsStr.includes('rt'),
      comment: requirementsStr.includes('comment'),
      bookmark: requirementsStr.includes('bookmark'),
    };

    // Calculate expiration
    const expiresAt = expiresIn ? Date.now() + (expiresIn * 60 * 60 * 1000) : null;

    // Ensure server exists first (to satisfy FOREIGN KEY constraint)
    serverQueries.upsertServer(
      client.db,
      interaction.guildId,
      interaction.guild.name
    );

    // Check if engagement already exists
    const existing = engagementQueries.getEngagementByTweetId(
      client.db,
      interaction.guildId,
      tweetId
    );

    if (existing) {
      return interaction.editReply({
        content: '❌ An engagement campaign for this tweet already exists!',
        ephemeral: true,
      });
    }

    // Create engagement in database
    const result = engagementQueries.createEngagement(
      client.db,
      interaction.guildId,
      tweetId,
      tweetUrl,
      requirements,
      points,
      interaction.user.id,
      expiresAt
    );

    logger.engagement('created', {
      guildId: interaction.guildId,
      tweetId,
      points,
      requirements,
      createdBy: interaction.user.id,
    });

    // Create engagement embed
    const embed = {
      color: 0x1da1f2,
      title: '🎯 New Engagement Campaign',
      description: `Complete the required actions on this tweet to earn **${points} points**!`,
      fields: [
        {
          name: '🔗 Tweet',
          value: `[Click here to view](${tweetUrl})`,
          inline: false,
        },
        {
          name: '✅ Required Actions',
          value: getRequirementsText(requirements),
          inline: true,
        },
        {
          name: '🎁 Reward',
          value: `${points} points`,
          inline: true,
        },
      ],
      footer: {
        text: expiresAt
          ? `Expires: ${new Date(expiresAt).toLocaleString()}`
          : 'No expiration',
      },
      timestamp: new Date().toISOString(),
    };

    // Create action buttons
    const buttons = createEngagementButtons(tweetUrl, requirements);

    // Add check button
    const checkRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`check_engagement:${result.lastInsertRowid}`)
        .setLabel('✓ Check My Engagement')
        .setStyle(ButtonStyle.Success)
    );

    // Post to channel
    await interaction.editReply({
      content: '@everyone New engagement campaign!',
      embeds: [embed],
      components: [...buttons, checkRow],
    });

    logger.info(`Engagement campaign posted: ${tweetId} in guild ${interaction.guildId}`);

  } catch (error) {
    logger.error('Error posting engagement:', error);
    await interaction.editReply({
      content: '❌ Failed to post engagement campaign. Please try again.',
      ephemeral: true,
    });
  }
}

function parseTweetId(url) {
  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
    /^(\d+)$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function getRequirementsText(requirements) {
  const actions = [];
  if (requirements.like) actions.push('❤️ Like');
  if (requirements.retweet) actions.push('🔁 Retweet');
  if (requirements.comment) actions.push('💬 Comment');
  if (requirements.bookmark) actions.push('🔖 Bookmark');
  return actions.join('\n');
}

function createEngagementButtons(tweetUrl, requirements) {
  const rows = [];
  const buttons = [];

  if (requirements.like) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('❤️ Like')
        .setURL(tweetUrl)
        .setStyle(ButtonStyle.Link)
    );
  }

  if (requirements.retweet) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('🔁 Retweet')
        .setURL(tweetUrl)
        .setStyle(ButtonStyle.Link)
    );
  }

  if (requirements.comment) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('💬 Comment')
        .setURL(tweetUrl)
        .setStyle(ButtonStyle.Link)
    );
  }

  if (requirements.bookmark) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('🔖 Bookmark')
        .setURL(tweetUrl)
        .setStyle(ButtonStyle.Link)
    );
  }

  // Split buttons into rows of 5 max
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  return rows;
}