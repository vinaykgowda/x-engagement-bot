class TweetParser {
  extractTweetId(url) {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  extractUsername(url) {
    const match = url.match(/https?:\/\/(twitter\.com|x\.com)\/([^\/\s]+)/);
    return match ? match[2] : null;
  }

  normalizeTweetUrl(url) {
    return url
      .replace('twitter.com', 'x.com')
      .split('?')[0]
      .split('#')[0];
  }

  buildTweetUrl(username, tweetId) {
    return `https://x.com/${username}/status/${tweetId}`;
  }

  buildProfileUrl(username) {
    return `https://x.com/${username}`;
  }

  parseTweetUrl(url) {
    const tweetId = this.extractTweetId(url);
    const username = this.extractUsername(url);
    
    if (!tweetId || !username) {
      return null;
    }

    return {
      tweetId,
      username,
      url: this.normalizeTweetUrl(url)
    };
  }

  extractHashtags(text) {
    const matches = text.match(/#[a-zA-Z0-9_]+/g);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  }

  extractMentions(text) {
    const matches = text.match(/@[a-zA-Z0-9_]+/g);
    return matches ? matches.map(mention => mention.slice(1)) : [];
  }

  extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  cleanTweetText(text) {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/@[a-zA-Z0-9_]+/g, '')
      .replace(/#[a-zA-Z0-9_]+/g, '')
      .trim();
  }

  isTweetUrl(url) {
    return /^https?:\/\/(twitter\.com|x\.com)\/[^\/\s]+\/status\/\d+/.test(url);
  }

  isProfileUrl(url) {
    return /^https?:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/?$/.test(url);
  }
}

module.exports = new TweetParser();
