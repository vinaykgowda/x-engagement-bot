import { EmbedBuilder } from 'discord.js';
import tweetValidator from './tweetValidator.js';
import frequencyChecker from './frequencyChecker.js';
import autoReward from './autoReward.js';
import db from '../../database/queries.js';
import logger from '../../config/logger.js';

class RaidMonitor {
  constructor(client) {
    this.client = client;
    this.raidChannels = new Map(); // guildId -> channelId
    this.isMonitoring = true;
  }

  /**
   * Initialize raid monitoring for a guild
   */
  async initialize(guildId) {
    try {
      const settings = await db.getGuildSettings(guildId);

      if (!settings || !settings.raid_channel_id) {
        logger.warn(`No raid channel configured for guild ${guildId}`);
        return false;
      }

      this.raidChannels.set(guildId, settings.raid_channel_id);

      logger.info(`Raid monitor initialized for guild ${guildId}, channel ${settings.raid_channel_id}`);
      return true;
    } catch (error) {
      logger.error('Error initializing raid monitor:', error);
      return false;
    }
  }

  /**
   * Initialize all guilds
   */
  async initializeAll() {
    try {
      const guilds = this.client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        await this.initialize(guildId);
      }

      logger.info(`Raid monitor initialized for ${guilds.size} guilds`);
    } catch (error) {
      logger.error('Error initializing all raid monitors:', error);
    }
  }

  /**
   * Check if a channel is a raid channel
   */
  isRaidChannel(guildId, channelId) {
    return this.raidChannels.get(guildId) === channelId;
  }

  /**
   * Process a message in the raid channel
   */
  async processRaidMessage(message) {
    // Ignore bot messages
    if (message.author.bot) {
      return;
    }

    // Check if this is a raid channel
    if (!this.isRaidChannel(message.guild.id, message.channel.id)) {
      return;
    }

    try {
      // Extract tweet URLs from message
      const tweetUrls = this.extractTweetUrls(message.content);

      if (tweetUrls.length === 0) {
        // No tweet links found - send help message
        await this.sendNoLinkWarning(message);
        return;
      }

      // Process each tweet URL
      for (const tweetUrl of tweetUrls) {
        await this.processTweetSubmission(message, tweetUrl);
      }
    } catch (error) {
      logger.error('Error processing raid message:', error);
      await message.reply('❌ An error occurred while processing your submission.');
    }
  }

  /**
   * Extract tweet URLs from message content
   */
  extractTweetUrls(content) {
    const tweetRegex = /https?:\/\/(twitter\.com|x\.com)\/[^\/\s]+\/status\/(\d+)/gi;
    const matches = content.match(tweetRegex);
    return matches || [];
  }

  /**
   * Process a single tweet submission
   */
  async processTweetSubmission(message, tweetUrl) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const username = message.author.username;

    try {
      // Add thinking reaction
      await message.react('🤔');

      // Step 1: Validate the tweet URL format
      const tweetId = tweetValidator.extractTweetId(tweetUrl);
      if (!tweetId) {
        await message.reactions.removeAll();
        await message.react('❌');
        await message.reply('❌ Invalid tweet URL format. Please post a valid X/Twitter link.');
        return;
      }

      // Step 2: Check if user has linked their Twitter profile
      const userProfile = await db.getUserProfile(userId, guildId);
      if (!userProfile || !userProfile.twitter_username) {
        await message.reactions.removeAll();
        await message.react('❌');

        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Twitter Profile Not Linked')
          .setDescription('You need to link your Twitter profile before participating in raids.')
          .addFields({
            name: 'How to Link',
            value: 'Use the `/set-profile` command to link your Twitter account.'
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return;
      }

      // Step 3: Check posting frequency (rate limiting)
      const canPost = await frequencyChecker.checkUserFrequency(userId, guildId);
      if (!canPost.allowed) {
        await message.reactions.removeAll();
        await message.react('⏰');

        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⏰ Posting Too Frequently')
          .setDescription(`Please wait before posting another raid tweet.`)
          .addFields({
            name: 'Time Remaining',
            value: canPost.timeRemaining
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return;
      }

      // Step 4: Validate tweet with scraper service
      const validation = await tweetValidator.validateTweet(tweetUrl, userProfile.twitter_username);

      if (!validation.valid) {
        await message.reactions.removeAll();
        await message.react('❌');

        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Tweet Validation Failed')
          .setDescription(validation.reason)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return;
      }

      // Step 5: Record the raid submission
      await db.recordRaidSubmission(userId, guildId, tweetId, tweetUrl, validation.engagementData);

      // Step 6: Update user's last post time
      await frequencyChecker.updateLastPostTime(userId, guildId);

      // Step 7: Auto-reward based on engagement
      const rewardResult = await autoReward.processReward(
        userId,
        guildId,
        validation.engagementData,
        userProfile.twitter_username
      );

      // Step 8: Send success message
      await message.reactions.removeAll();
      await message.react('✅');

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Raid Tweet Verified!')
        .setDescription(`Your raid participation has been recorded.`)
        .addFields(
          { name: '🔗 Tweet', value: `[View Tweet](${tweetUrl})`, inline: true },
          { name: '👤 Twitter', value: `@${userProfile.twitter_username}`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '❤️ Likes', value: validation.engagementData.likes.toString(), inline: true },
          { name: '🔄 Retweets', value: validation.engagementData.retweets.toString(), inline: true },
          { name: '💬 Replies', value: validation.engagementData.replies.toString(), inline: true }
        )
        .setTimestamp();

      if (rewardResult.rewarded) {
        embed.addFields({
          name: '🎁 Reward Earned',
          value: `+${rewardResult.points} points`
        });
      }

      await message.reply({ embeds: [embed] });

      logger.info(`Raid submission processed: User ${userId}, Tweet ${tweetId}, Points: ${rewardResult.points}`);

    } catch (error) {
      logger.error('Error processing tweet submission:', error);
      await message.reactions.removeAll();
      await message.react('❌');
      await message.reply('❌ An error occurred while validating your tweet. Please try again later.');
    }
  }

  /**
   * Send warning when no tweet link is found
   */
  async sendNoLinkWarning(message) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ No Tweet Link Found')
      .setDescription('Please post a valid X/Twitter link to participate in the raid.')
      .addFields({
        name: 'Valid Format',
        value: '`https://x.com/username/status/1234567890`\nor\n`https://twitter.com/username/status/1234567890`'
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Update raid channel for a guild
   */
  async updateRaidChannel(guildId, channelId) {
    this.raidChannels.set(guildId, channelId);
    await db.updateGuildSettings(guildId, { raid_channel_id: channelId });
    logger.info(`Raid channel updated for guild ${guildId}: ${channelId}`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    logger.info('Raid monitor stopped');
  }

  /**
   * Start monitoring
   */
  start() {
    this.isMonitoring = true;
    logger.info('Raid monitor started');
  }
}

export default RaidMonitor;