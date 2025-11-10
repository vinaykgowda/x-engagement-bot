import { EmbedBuilder } from 'discord.js';

class EngagementEmbed {
  create(engagement) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('🎯 New Engagement Campaign')
      .setDescription(`Complete the required actions to earn **${engagement.points_reward} points**!`)
      .setURL(engagement.tweet_url)
      .setTimestamp();

    const requirements = [];
    if (engagement.require_like) requirements.push('❤️ Like');
    if (engagement.require_retweet) requirements.push('🔄 Retweet');
    if (engagement.require_comment) requirements.push('💬 Comment');
    if (engagement.require_bookmark) requirements.push('🔖 Bookmark');

    embed.addFields(
      { name: '📋 Requirements', value: requirements.join('\n'), inline: true },
      { name: '🎁 Reward', value: `${engagement.points_reward} points`, inline: true },
      { name: '🔗 Tweet', value: `[View Tweet](${engagement.tweet_url})`, inline: false }
    );

    if (engagement.expires_at) {
      embed.addFields({
        name: '⏰ Expires',
        value: `<t:${Math.floor(engagement.expires_at / 1000)}:R>`,
        inline: true
      });
    }

    embed.setFooter({ text: 'Complete all requirements and click Check Progress' });

    return embed;
  }

  createProgressEmbed(engagement, userEngagement, completed) {
    const embed = new EmbedBuilder()
      .setColor(completed ? '#00FF00' : '#FFA500')
      .setTitle(completed ? '✅ Campaign Completed!' : '📊 Your Progress')
      .setURL(engagement.tweet_url)
      .setTimestamp();

    const status = [];
    if (engagement.require_like) {
      status.push(`${userEngagement.liked ? '✅' : '❌'} Like`);
    }
    if (engagement.require_retweet) {
      status.push(`${userEngagement.retweeted ? '✅' : '❌'} Retweet`);
    }
    if (engagement.require_comment) {
      status.push(`${userEngagement.commented ? '✅' : '❌'} Comment`);
    }
    if (engagement.require_bookmark) {
      status.push(`${userEngagement.bookmarked ? '✅' : '❌'} Bookmark`);
    }

    embed.addFields({ name: '📋 Status', value: status.join('\n') });

    if (completed) {
      embed.addFields({
        name: '🎁 Reward Earned',
        value: `+${engagement.points_reward} points`,
        inline: true
      });
    }

    return embed;
  }

  createListEmbed(engagements) {
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('📋 Active Engagement Campaigns')
      .setTimestamp();

    if (engagements.length === 0) {
      embed.setDescription('No active campaigns at the moment.');
      return embed;
    }

    const list = engagements.map((eng, index) => {
      const reqs = [];
      if (eng.require_like) reqs.push('❤️');
      if (eng.require_retweet) reqs.push('🔄');
      if (eng.require_comment) reqs.push('💬');
      if (eng.require_bookmark) reqs.push('🔖');
      
      return `**${index + 1}.** ${reqs.join(' ')} - ${eng.points_reward} pts - [Tweet](${eng.tweet_url})`;
    }).join('\n');

    embed.setDescription(list);
    embed.setFooter({ text: `${engagements.length} active campaign(s)` });

    return embed;
  }
}

export default new EngagementEmbed();
