import { EmbedBuilder } from 'discord.js';

class ProfileEmbed {
  create(user, profile, points, wallet) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle(`👤 ${user.username}'s Profile`)
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    embed.addFields({
      name: '🆔 Discord',
      value: `<@${user.id}>`,
      inline: false
    });

    if (profile?.twitter_username) {
      embed.addFields({
        name: '🐦 Twitter',
        value: `[@${profile.twitter_username}](${profile.twitter_url})${profile.verified ? ' ✅' : ''}`,
        inline: false
      });
    } else {
      embed.addFields({
        name: '🐦 Twitter',
        value: 'Not linked',
        inline: false
      });
    }

    if (wallet?.wallet_address) {
      const shortenedWallet = `${wallet.wallet_address.substring(0, 6)}...${wallet.wallet_address.substring(wallet.wallet_address.length - 4)}`;
      embed.addFields({
        name: '💎 Solana Wallet',
        value: `\`${shortenedWallet}\``,
        inline: false
      });
    } else {
      embed.addFields({
        name: '💎 Solana Wallet',
        value: 'Not linked',
        inline: false
      });
    }

    if (points) {
      embed.addFields(
        { name: '💰 Total Points', value: `${points.total_points}`, inline: true },
        { name: '💵 Available', value: `${points.available_points}`, inline: true }
      );
    }

    return embed;
  }

  createVerificationEmbed(verificationCode, twitterUsername, expiresAt) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('🔐 Twitter Verification')
      .setDescription('To verify your Twitter account ownership:')
      .addFields(
        {
          name: '1️⃣ Tweet This Code',
          value: `\`\`\`${verificationCode}\`\`\``,
          inline: false
        },
        {
          name: '2️⃣ From Account',
          value: `[@${twitterUsername}](https://x.com/${twitterUsername})`,
          inline: false
        },
        {
          name: '3️⃣ Example Tweet',
          value: `Verifying my Discord account: ${verificationCode}`,
          inline: false
        },
        {
          name: '4️⃣ Submit',
          value: 'Use `/verify-profile <tweet-url>` with your tweet URL',
          inline: false
        }
      )
      .setFooter({ text: `Expires at ${new Date(expiresAt).toLocaleString()}` })
      .setTimestamp();

    return embed;
  }

  createVerificationSuccessEmbed(twitterUsername) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Twitter Profile Verified!')
      .setDescription('Your Twitter account has been successfully linked.')
      .addFields({
        name: 'Twitter Account',
        value: `[@${twitterUsername}](https://x.com/${twitterUsername})`,
        inline: false
      })
      .setTimestamp();

    return embed;
  }

  createWalletLinkedEmbed(walletAddress) {
    const shortened = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Wallet Linked!')
      .setDescription('Your Solana wallet has been successfully linked.')
      .addFields({
        name: '💎 Wallet Address',
        value: `\`${shortened}\``,
        inline: false
      })
      .setTimestamp();

    return embed;
  }

  createStatsEmbed(stats, username) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle(`📊 ${username}'s Statistics`)
      .addFields(
        { name: '🎯 Engagements Completed', value: `${stats.completedEngagements || 0}`, inline: true },
        { name: '💰 Total Points Earned', value: `${stats.totalPoints || 0}`, inline: true },
        { name: '💵 Points Spent', value: `${stats.pointsSpent || 0}`, inline: true },
        { name: '🏆 Current Rank', value: `#${stats.rank || 'N/A'}`, inline: true },
        { name: '🎁 Rewards Claimed', value: `${stats.rewardsClaimed || 0}`, inline: true },
        { name: '📅 Member Since', value: `<t:${Math.floor(stats.createdAt / 1000)}:D>`, inline: true }
      )
      .setTimestamp();

    return embed;
  }
}

export default new ProfileEmbed();
