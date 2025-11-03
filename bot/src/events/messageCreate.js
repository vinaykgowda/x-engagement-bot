// ============================================================================
// FILE 3: bot/src/events/messageCreate.js
// ============================================================================

import { Events } from 'discord.js';
import logger from '../config/logger.js';
import { globalUserQueries } from '../database/queries.js';

export default {
  name: Events.MessageCreate,
  async execute(client, message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only process messages in guilds
    if (!message.guildId) return;

    try {
      // Check if this is a raid channel
      const raidConfig = client.db.prepare(`
        SELECT * FROM server_raid_config WHERE guild_id = ? AND raid_channel_id = ?
      `).get(message.guildId, message.channelId);

      if (!raidConfig) return;

      // Check if message contains a tweet URL
      const tweetUrl = extractTweetUrl(message.content);
      if (!tweetUrl) return;

      await handleRaidTweet(client, message, raidConfig, tweetUrl);

    } catch (error) {
      logger.error('Error handling message:', error);
    }
  },
};

function extractTweetUrl(content) {
  const tweetPatterns = [
    /https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/(\d+)/gi,
  ];

  for (const pattern of tweetPatterns) {
    const match = content.match(pattern);
    if (match) return match[0];
  }

  return null;
}

function extractTweetId(url) {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

async function handleRaidTweet(client, message, raidConfig, tweetUrl) {
  const userId = message.author.id;
  const guildId = message.guildId;
  const tweetId = extractTweetId(tweetUrl);

  if (!tweetId) {
    return message.reply('❌ Invalid tweet URL.');
  }

  // Ensure user exists in global_users
  globalUserQueries.upsertUser(
    client.db,
    userId,
    message.author.username,
    message.author.discriminator
  );

  // Check if user has Twitter profile linked
  const twitterProfile = client.db.prepare(
    'SELECT * FROM global_twitter_profiles WHERE user_id = ?'
  ).get(userId);

  if (!twitterProfile) {
    return message.reply({
      content: '❌ Please link your Twitter profile first using `/set-profile`',
    });
  }

  // Check if user has wallet for auto-rewards
  const wallet = client.db.prepare(
    'SELECT * FROM global_wallets WHERE user_id = ?'
  ).get(userId);

  if (!wallet && raidConfig.auto_rewards_enabled) {
    return message.reply({
      content: '⚠️ Please set your Solana wallet using `/set-wallet` to receive automatic rewards.',
    });
  }

  // Check frequency limit
  const lastTweet = client.db.prepare(`
    SELECT * FROM server_raid_tweets
    WHERE guild_id = ? AND user_id = ?
    ORDER BY posted_at DESC
    LIMIT 1
  `).get(guildId, userId);

  if (lastTweet) {
    const hoursSinceLastTweet = (Date.now() - lastTweet.posted_at) / (1000 * 60 * 60);

    if (hoursSinceLastTweet < raidConfig.tweet_frequency_hours) {
      const hoursRemaining = Math.ceil(raidConfig.tweet_frequency_hours - hoursSinceLastTweet);
      return message.reply({
        content: `⏰ You can post another tweet in **${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}**.\n\nLast tweet: <t:${Math.floor(lastTweet.posted_at / 1000)}:R>`,
        ephemeral: true,
      });
    }
  }

  // Check if tweet already submitted
  const existingTweet = client.db.prepare(`
    SELECT * FROM server_raid_tweets
    WHERE guild_id = ? AND tweet_id = ?
  `).get(guildId, tweetId);

  if (existingTweet) {
    return message.reply('❌ This tweet has already been submitted!');
  }

  // Calculate rewards based on user roles
  const member = message.member;
  let rewardType = 'points';
  let rewardAmount = raidConfig.default_raid_points;

  // Check for role-based rewards
  const roleRewards = client.db.prepare(`
    SELECT * FROM server_raid_role_rewards WHERE guild_id = ?
  `).all(guildId);

  for (const roleReward of roleRewards) {
    if (member.roles.cache.has(roleReward.role_id)) {
      rewardType = roleReward.reward_type;
      rewardAmount = roleReward.reward_amount;
      break; // Use first matching role
    }
  }

  // Record tweet in database
  const now = Date.now();
  client.db.prepare(`
    INSERT INTO server_raid_tweets (
      guild_id, user_id, tweet_id, tweet_url,
      points_earned, reward_type, reward_amount,
      reward_status, posted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    guildId,
    userId,
    tweetId,
    tweetUrl,
    rewardType === 'points' ? rewardAmount : 0,
    rewardType,
    rewardAmount,
    now
  );

  logger.raid('tweet_submitted', {
    guildId,
    userId,
    tweetId,
    rewardType,
    rewardAmount,
  });

  // Award points immediately
  if (rewardType === 'points') {
    client.db.prepare(`
      INSERT INTO server_points (user_id, guild_id, total_points, available_points, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id) DO UPDATE SET
        total_points = total_points + excluded.total_points,
        available_points = available_points + excluded.available_points,
        updated_at = excluded.updated_at
    `).run(userId, guildId, rewardAmount, rewardAmount, now);

    // Update tweet status
    client.db.prepare(`
      UPDATE server_raid_tweets
      SET reward_status = 'completed'
      WHERE guild_id = ? AND tweet_id = ?
    `).run(guildId, tweetId);
  }

  // Post to raid post channel
  const raidPostChannel = message.guild.channels.cache.get(raidConfig.raid_post_channel_id);

  if (raidPostChannel) {
    const embed = {
      color: 0x1da1f2,
      author: {
        name: message.author.username,
        icon_url: message.author.displayAvatarURL(),
      },
      description: `🚀 **New Raid Tweet**\n\n[View Tweet](${tweetUrl})`,
      fields: [
        {
          name: '👤 User',
          value: `<@${userId}>`,
          inline: true,
        },
        {
          name: '🎁 Reward',
          value: rewardType === 'points'
            ? `${rewardAmount} points`
            : `${rewardAmount} ${rewardType.toUpperCase()}`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await raidPostChannel.send({ embeds: [embed] });
  }

  // Reply to user
  await message.reply({
    embeds: [{
      color: 0x00ff00,
      title: '✅ Tweet Submitted!',
      description:
        rewardType === 'points'
          ? `You earned **${rewardAmount} points**!`
          : `Reward pending: **${rewardAmount} ${rewardType.toUpperCase()}**`,
      fields: [
        {
          name: '🔗 Your Tweet',
          value: `[View on Twitter](${tweetUrl})`,
        },
      ],
      footer: {
        text: `Next tweet available in ${raidConfig.tweet_frequency_hours} hours`,
      },
      timestamp: new Date().toISOString(),
    }],
  });

  // Process Solana rewards in background if needed
  if (rewardType !== 'points' && raidConfig.auto_rewards_enabled && wallet) {
    processReward(client, userId, guildId, tweetId, rewardType, rewardAmount, wallet.wallet_address);
  }
}

async function processReward(client, userId, guildId, tweetId, rewardType, amount, walletAddress) {
  try {
    // Import Solana manager
    const { default: solanaManager } = await import('../handlers/rewards/solanaManager.js');

    // Send reward
    const txHash = await solanaManager.sendReward(walletAddress, amount, rewardType);

    if (txHash) {
      // Update database
      client.db.prepare(`
        UPDATE server_raid_tweets
        SET reward_status = 'completed', transaction_hash = ?
        WHERE guild_id = ? AND tweet_id = ?
      `).run(txHash, guildId, tweetId);

      // Log transaction
      client.db.prepare(`
        INSERT INTO server_transactions (
          guild_id, user_id, transaction_type, amount,
          currency_type, status, transaction_hash,
          description, created_at
        ) VALUES (?, ?, 'raid_reward', ?, ?, 'completed', ?, 'Raid tweet reward', ?)
      `).run(guildId, userId, amount, rewardType, txHash, Date.now());

      logger.reward('sent', userId, amount, rewardType);
    }
  } catch (error) {
    logger.error('Error processing reward:', error);

    // Mark as failed
    client.db.prepare(`
      UPDATE server_raid_tweets
      SET reward_status = 'failed'
      WHERE guild_id = ? AND tweet_id = ?
    `).run(guildId, tweetId);
  }
}
