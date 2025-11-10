class Validation {
  isValidTwitterUsername(username) {
    const cleaned = username.replace('@', '');
    return /^[a-zA-Z0-9_]{1,15}$/.test(cleaned);
  }

  isValidTwitterUrl(url) {
    return /^https?:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/?$/.test(url);
  }

  isValidTweetUrl(url) {
    return /^https?:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+/.test(url);
  }

  isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  isValidDiscordId(id) {
    return /^\d{17,19}$/.test(id);
  }

  isValidPoints(points) {
    return Number.isInteger(points) && points > 0 && points <= 100000;
  }

  isValidAccessCode(code) {
    return /^[A-Z0-9]{12}$/.test(code);
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
  }

  validateEngagementRequirements(requirements) {
    const { like, retweet, comment, bookmark } = requirements;
    return (like || retweet || comment || bookmark) === true;
  }

  validatePointsRange(points, min = 1, max = 100000) {
    return Number.isInteger(points) && points >= min && points <= max;
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validateLength(str, min, max) {
    return str.length >= min && str.length <= max;
  }
}

export default new Validation();
