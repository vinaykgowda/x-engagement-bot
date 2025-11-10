import logger from '../../config/logger.js';

class ProfileValidator {
  constructor() {
    // Regex patterns for validation
    this.patterns = {
      // Twitter username pattern: 1-15 characters, alphanumeric and underscore
      username: /^@?([a-zA-Z0-9_]{1,15})$/,
      
      // Twitter profile URLs
      profileUrl: /^https?:\/\/(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})\/?$/,
      
      // Tweet URLs (for verification)
      tweetUrl: /^https?:\/\/(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})\/status\/(\d+)/
    };

    // Reserved/system usernames that cannot be used
    this.reservedUsernames = [
      'twitter', 'x', 'admin', 'support', 'api', 'dev', 'home',
      'search', 'help', 'settings', 'privacy', 'tos', 'about',
      'messages', 'notifications', 'explore', 'i'
    ];

    // Minimum and maximum lengths
    this.constraints = {
      minUsernameLength: 1,
      maxUsernameLength: 15
    };
  }

  /**
   * Main validation method for Twitter input
   * Accepts either username or URL
   */
  validateTwitterInput(input) {
    try {
      // Clean input
      const cleaned = input.trim();

      if (!cleaned) {
        return {
          valid: false,
          error: 'Twitter username or URL is required'
        };
      }

      // Check if it's a URL
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        return this.validateProfileUrl(cleaned);
      }

      // Otherwise treat as username
      return this.validateUsername(cleaned);

    } catch (error) {
      logger.error('Error validating Twitter input:', error);
      return {
        valid: false,
        error: 'Invalid Twitter username or URL format'
      };
    }
  }

  /**
   * Validate Twitter username
   */
  validateUsername(username) {
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '').trim();

      // Check if empty
      if (!cleanUsername) {
        return {
          valid: false,
          error: 'Username cannot be empty'
        };
      }

      // Check length
      if (cleanUsername.length < this.constraints.minUsernameLength) {
        return {
          valid: false,
          error: `Username must be at least ${this.constraints.minUsernameLength} character`
        };
      }

      if (cleanUsername.length > this.constraints.maxUsernameLength) {
        return {
          valid: false,
          error: `Username cannot exceed ${this.constraints.maxUsernameLength} characters`
        };
      }

      // Check pattern (alphanumeric and underscore only)
      if (!this.patterns.username.test(cleanUsername)) {
        return {
          valid: false,
          error: 'Username can only contain letters, numbers, and underscores'
        };
      }

      // Check for reserved usernames
      if (this.isReservedUsername(cleanUsername)) {
        return {
          valid: false,
          error: 'This username is reserved and cannot be used'
        };
      }

      // Generate Twitter URL
      const twitterUrl = `https://x.com/${cleanUsername}`;

      return {
        valid: true,
        twitterUsername: cleanUsername,
        twitterUrl,
        normalized: cleanUsername.toLowerCase()
      };

    } catch (error) {
      logger.error('Error validating username:', error);
      return {
        valid: false,
        error: 'Invalid username format'
      };
    }
  }

  /**
   * Validate Twitter profile URL
   */
  validateProfileUrl(url) {
    try {
      // Check pattern
      const match = url.match(this.patterns.profileUrl);

      if (!match) {
        return {
          valid: false,
          error: 'Invalid Twitter profile URL format. Expected: https://x.com/username or https://twitter.com/username'
        };
      }

      const domain = match[1]; // twitter.com or x.com
      const username = match[2];

      // Validate the extracted username
      const usernameValidation = this.validateUsername(username);

      if (!usernameValidation.valid) {
        return usernameValidation;
      }

      // Normalize to x.com
      const normalizedUrl = `https://x.com/${username}`;

      return {
        valid: true,
        twitterUsername: username,
        twitterUrl: normalizedUrl,
        normalized: username.toLowerCase(),
        originalDomain: domain
      };

    } catch (error) {
      logger.error('Error validating profile URL:', error);
      return {
        valid: false,
        error: 'Invalid profile URL format'
      };
    }
  }

  /**
   * Validate tweet URL (for verification)
   */
  validateTweetUrl(url) {
    try {
      const match = url.match(this.patterns.tweetUrl);

      if (!match) {
        return {
          valid: false,
          error: 'Invalid tweet URL format. Expected: https://x.com/username/status/1234567890'
        };
      }

      const domain = match[1];
      const username = match[2];
      const tweetId = match[3];

      return {
        valid: true,
        domain,
        username,
        tweetId,
        fullUrl: url
      };

    } catch (error) {
      logger.error('Error validating tweet URL:', error);
      return {
        valid: false,
        error: 'Invalid tweet URL format'
      };
    }
  }

  /**
   * Check if username is reserved
   */
  isReservedUsername(username) {
    return this.reservedUsernames.includes(username.toLowerCase());
  }

  /**
   * Extract username from any Twitter URL
   */
  extractUsernameFromUrl(url) {
    try {
      // Try profile URL pattern
      let match = url.match(this.patterns.profileUrl);
      if (match) {
        return match[2];
      }

      // Try tweet URL pattern
      match = url.match(this.patterns.tweetUrl);
      if (match) {
        return match[2];
      }

      return null;
    } catch (error) {
      logger.error('Error extracting username from URL:', error);
      return null;
    }
  }

  /**
   * Normalize Twitter URL (convert twitter.com to x.com)
   */
  normalizeUrl(url) {
    return url.replace('twitter.com', 'x.com');
  }

  /**
   * Validate username format only (without length checks)
   */
  isValidUsernameFormat(username) {
    const cleanUsername = username.replace('@', '').trim();
    return this.patterns.username.test(cleanUsername);
  }

  /**
   * Validate multiple usernames at once
   */
  validateMultipleUsernames(usernames) {
    const results = [];

    for (const username of usernames) {
      const validation = this.validateUsername(username);
      results.push({
        input: username,
        ...validation
      });
    }

    return {
      total: usernames.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      results
    };
  }

  /**
   * Get username constraints
   */
  getConstraints() {
    return {
      minLength: this.constraints.minUsernameLength,
      maxLength: this.constraints.maxUsernameLength,
      allowedCharacters: 'Letters (a-z, A-Z), numbers (0-9), and underscores (_)',
      reservedUsernames: this.reservedUsernames,
      examples: {
        valid: ['jack', 'elonmusk', 'user_123', 'Twitter_Dev'],
        invalid: ['user-name', 'user@name', 'user.name', 'a'.repeat(16)]
      }
    };
  }

  /**
   * Sanitize username (remove invalid characters)
   */
  sanitizeUsername(username) {
    // Remove @ symbol
    let sanitized = username.replace('@', '');
    
    // Remove invalid characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Truncate to max length
    if (sanitized.length > this.constraints.maxUsernameLength) {
      sanitized = sanitized.substring(0, this.constraints.maxUsernameLength);
    }

    return sanitized;
  }

  /**
   * Compare two usernames (case-insensitive)
   */
  compareUsernames(username1, username2) {
    const clean1 = username1.replace('@', '').toLowerCase().trim();
    const clean2 = username2.replace('@', '').toLowerCase().trim();
    return clean1 === clean2;
  }

  /**
   * Check if URL is a valid Twitter/X domain
   */
  isTwitterDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'twitter.com' || 
             urlObj.hostname === 'x.com' ||
             urlObj.hostname === 'www.twitter.com' ||
             urlObj.hostname === 'www.x.com';
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate example verification tweet
   */
  generateVerificationTweetExample(code, username) {
    return {
      text: `Verifying my Discord account with code: ${code}`,
      hashtags: ['DiscordVerification'],
      fullExample: `Verifying my Discord account with code: ${code} #DiscordVerification`,
      instructions: [
        '1. Copy the text above',
        `2. Post it as a tweet from @${username}`,
        '3. Copy the tweet URL',
        '4. Submit the tweet URL for verification'
      ]
    };
  }

  /**
   * Validate batch of Twitter inputs
   */
  validateBatch(inputs) {
    const results = {
      valid: [],
      invalid: [],
      summary: {
        total: inputs.length,
        validCount: 0,
        invalidCount: 0
      }
    };

    for (const input of inputs) {
      const validation = this.validateTwitterInput(input);
      
      if (validation.valid) {
        results.valid.push({
          input,
          username: validation.twitterUsername,
          url: validation.twitterUrl
        });
        results.summary.validCount++;
      } else {
        results.invalid.push({
          input,
          error: validation.error
        });
        results.summary.invalidCount++;
      }
    }

    return results;
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      constraints: this.constraints,
      reservedUsernamesCount: this.reservedUsernames.length,
      patternsSupported: Object.keys(this.patterns),
      features: [
        'Username validation',
        'Profile URL validation',
        'Tweet URL validation',
        'Reserved username checking',
        'Character sanitization',
        'Batch validation'
      ]
    };
  }
}

export default new ProfileValidator();
