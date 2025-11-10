class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  check(key, maxRequests, windowMs) {
    const now = Date.now();
    const userLimits = this.limits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > userLimits.resetAt) {
      userLimits.count = 0;
      userLimits.resetAt = now + windowMs;
    }

    if (userLimits.count >= maxRequests) {
      const resetIn = userLimits.resetAt - now;
      return {
        allowed: false,
        resetIn,
        resetAt: userLimits.resetAt
      };
    }

    userLimits.count++;
    this.limits.set(key, userLimits);

    return {
      allowed: true,
      remaining: maxRequests - userLimits.count,
      resetAt: userLimits.resetAt
    };
  }

  reset(key) {
    this.limits.delete(key);
  }

  resetAll() {
    this.limits.clear();
  }

  getUserKey(userId, action) {
    return `${userId}:${action}`;
  }

  getGuildKey(guildId, action) {
    return `${guildId}:${action}`;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (now > value.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

export default new RateLimiter();
