const db = require('../../database/queries');
const logger = require('../../config/logger');

class DuplicateChecker {
  constructor() {
    // Cache recent checks for performance
    this.checkCache = new Map();
    this.cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main duplicate check method
   * Checks both directions:
   * 1. Is this Twitter account already linked to another Discord user?
   * 2. Does this Discord user already have a Twitter account linked?
   */
  async checkForDuplicates(userId, twitterUsername) {
    try {
      // Normalize Twitter username
      const normalizedUsername = this.normalizeUsername(twitterUsername);

      // Check if Twitter username is already linked to another user
      const twitterDuplicate = this.checkTwitterUsernameDuplicate(
        normalizedUsername,
        userId
      );

      if (twitterDuplicate.isDuplicate) {
        return {
          allowed: false,
          error: `Twitter account @${normalizedUsername} is already linked to another Discord user`,
          duplicateType: 'twitter_account',
          duplicateInfo: twitterDuplicate.info
        };
      }

      // Check if this Discord user already has a Twitter profile linked
      const userDuplicate = this.checkUserHasProfile(userId);

      if (userDuplicate.hasProfile) {
        return {
          allowed: false,
          error: `You already have a Twitter account linked: @${userDuplicate.info.existingUsername}`,
          duplicateType: 'user_has_profile',
          duplicateInfo: userDuplicate.info,
          suggestion: 'Use the unlink command first, then link your new profile'
        };
      }

      // No duplicates found
      logger.info(`Duplicate check passed for user ${userId} -> @${normalizedUsername}`);

      return {
        allowed: true,
        message: 'No duplicates found'
      };

    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      
      // On error, fail closed (don't allow)
      return {
        allowed: false,
        error: 'Error checking for duplicates. Please try again.',
        technicalError: error.message
      };
    }
  }

  /**
   * Check if Twitter username is already linked to another Discord user
   */
  checkTwitterUsernameDuplicate(twitterUsername, excludeUserId) {
    try {
      const existing = db.twitterQueries.getProfileByUsername(
        db.connection,
        twitterUsername
      );

      if (!existing) {
        return {
          isDuplicate: false
        };
      }

      // If it's the same user, not a duplicate
      if (existing.user_id === excludeUserId) {
        return {
          isDuplicate: false
        };
      }

      // Found a duplicate
      return {
        isDuplicate: true,
        info: {
          twitterUsername: existing.twitter_username,
          linkedUserId: existing.user_id,
          linkedAt: existing.created_at,
          verified: existing.verified === 1
        }
      };

    } catch (error) {
      logger.error('Error checking Twitter username duplicate:', error);
      throw error;
    }
  }

  /**
   * Check if Discord user already has a Twitter profile linked
   */
  checkUserHasProfile(userId) {
    try {
      const existing = db.twitterQueries.getProfile(db.connection, userId);

      if (!existing) {
        return {
          hasProfile: false
        };
      }

      return {
        hasProfile: true,
        info: {
          existingUsername: existing.twitter_username,
          existingUrl: existing.twitter_url,
          linkedAt: existing.created_at,
          verified: existing.verified === 1
        }
      };

    } catch (error) {
      logger.error('Error checking user profile:', error);
      throw error;
    }
  }

  /**
   * Batch check for multiple users
   * Useful for admin audits
   */
  async batchCheckDuplicates() {
    try {
      // Get all Twitter profiles
      const allProfiles = db.connection.prepare(
        'SELECT user_id, twitter_username FROM global_twitter_profiles'
      ).all();

      // Group by Twitter username
      const usernameMap = new Map();

      for (const profile of allProfiles) {
        const username = profile.twitter_username.toLowerCase();
        
        if (!usernameMap.has(username)) {
          usernameMap.set(username, []);
        }
        
        usernameMap.get(username).push(profile.user_id);
      }

      // Find duplicates
      const duplicates = [];

      for (const [username, userIds] of usernameMap.entries()) {
        if (userIds.length > 1) {
          duplicates.push({
            twitterUsername: username,
            discordUsers: userIds,
            count: userIds.length
          });
        }
      }

      if (duplicates.length > 0) {
        logger.warn(`Found ${duplicates.length} duplicate Twitter accounts`);
      }

      return {
        success: true,
        totalProfiles: allProfiles.length,
        duplicateCount: duplicates.length,
        duplicates
      };

    } catch (error) {
      logger.error('Error in batch duplicate check:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a specific user has duplicates across guilds
   * (They should have the same global profile)
   */
  checkUserConsistency(userId) {
    try {
      const profile = db.twitterQueries.getProfile(db.connection, userId);

      if (!profile) {
        return {
          consistent: true,
          message: 'No profile linked'
        };
      }

      // In the global profile system, there should only be one profile per user
      // This is enforced by the UNIQUE constraint on user_id
      
      return {
        consistent: true,
        profile: {
          twitterUsername: profile.twitter_username,
          linkedAt: profile.created_at,
          verified: profile.verified === 1
        }
      };

    } catch (error) {
      logger.error('Error checking user consistency:', error);
      return {
        consistent: false,
        error: error.message
      };
    }
  }

  /**
   * Find all users who linked a specific Twitter account
   */
  findUsersWithTwitterAccount(twitterUsername) {
    try {
      const normalizedUsername = this.normalizeUsername(twitterUsername);
      
      const profile = db.twitterQueries.getProfileByUsername(
        db.connection,
        normalizedUsername
      );

      if (!profile) {
        return {
          found: false,
          message: `No Discord user has linked @${normalizedUsername}`
        };
      }

      return {
        found: true,
        userId: profile.user_id,
        profile: {
          twitterUsername: profile.twitter_username,
          twitterUrl: profile.twitter_url,
          linkedAt: profile.created_at,
          verified: profile.verified === 1
        }
      };

    } catch (error) {
      logger.error('Error finding users with Twitter account:', error);
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Normalize Twitter username (remove @, lowercase)
   */
  normalizeUsername(username) {
    return username.replace('@', '').toLowerCase().trim();
  }

  /**
   * Get duplicate statistics
   */
  async getDuplicateStats() {
    try {
      const batchCheck = await this.batchCheckDuplicates();

      const stats = {
        totalProfiles: batchCheck.totalProfiles,
        uniqueTwitterAccounts: batchCheck.totalProfiles - batchCheck.duplicateCount,
        duplicateTwitterAccounts: batchCheck.duplicateCount,
        duplicates: batchCheck.duplicates || []
      };

      return {
        success: true,
        stats
      };

    } catch (error) {
      logger.error('Error getting duplicate stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resolve duplicate by unlinking all except the first one
   * Admin function
   */
  async resolveDuplicate(twitterUsername, keepUserId) {
    try {
      const normalizedUsername = this.normalizeUsername(twitterUsername);

      // Get all profiles with this Twitter username
      const allProfiles = db.connection.prepare(
        'SELECT * FROM global_twitter_profiles WHERE twitter_username = ?'
      ).all(normalizedUsername);

      if (allProfiles.length <= 1) {
        return {
          success: false,
          error: 'No duplicate found'
        };
      }

      // Keep the specified user's profile
      const toKeep = allProfiles.find(p => p.user_id === keepUserId);

      if (!toKeep) {
        return {
          success: false,
          error: 'Specified user does not have this Twitter account linked'
        };
      }

      // Unlink all others
      const toRemove = allProfiles.filter(p => p.user_id !== keepUserId);
      
      for (const profile of toRemove) {
        db.connection.prepare(
          'DELETE FROM global_twitter_profiles WHERE user_id = ?'
        ).run(profile.user_id);
        
        logger.info(`Removed duplicate Twitter profile: ${profile.user_id} -> @${normalizedUsername}`);
      }

      return {
        success: true,
        message: `Resolved duplicate. Kept @${normalizedUsername} for user ${keepUserId}`,
        removedCount: toRemove.length,
        removedUsers: toRemove.map(p => p.user_id)
      };

    } catch (error) {
      logger.error('Error resolving duplicate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate that database constraints are working
   */
  async validateDatabaseConstraints() {
    try {
      // Check UNIQUE constraint on user_id
      const userIdCheck = db.connection.prepare(`
        SELECT user_id, COUNT(*) as count
        FROM global_twitter_profiles
        GROUP BY user_id
        HAVING count > 1
      `).all();

      // Check UNIQUE constraint on twitter_username
      const usernameCheck = db.connection.prepare(`
        SELECT twitter_username, COUNT(*) as count
        FROM global_twitter_profiles
        GROUP BY twitter_username
        HAVING count > 1
      `).all();

      const isValid = userIdCheck.length === 0 && usernameCheck.length === 0;

      return {
        valid: isValid,
        issues: {
          duplicateUserIds: userIdCheck,
          duplicateTwitterUsernames: usernameCheck
        },
        message: isValid 
          ? 'Database constraints are working correctly'
          : 'Database constraint violations detected!'
      };

    } catch (error) {
      logger.error('Error validating database constraints:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.checkCache.clear();
    logger.info('Duplicate check cache cleared');
  }
}

module.exports = new DuplicateChecker();
