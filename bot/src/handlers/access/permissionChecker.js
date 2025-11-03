const { PermissionFlagsBits } = require('discord.js');
const db = require('../../database/queries');
const logger = require('../../config/logger');

class PermissionChecker {
  constructor() {
    this.superAdminIds = process.env.SUPER_ADMIN_IDS 
      ? process.env.SUPER_ADMIN_IDS.split(',')
      : [];
  }

  isSuperAdmin(userId) {
    return this.superAdminIds.includes(userId);
  }

  isServerOwner(userId, guild) {
    return guild.ownerId === userId;
  }

  hasAdminPermission(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  hasManageServerPermission(member) {
    return member.permissions.has(PermissionFlagsBits.ManageGuild);
  }

  hasModeratorRole(member, guildId) {
    // Check if user has a designated moderator role
    const config = db.serverQueries.getConfig(db.connection, guildId);
    
    if (config?.moderator_role_id) {
      return member.roles.cache.has(config.moderator_role_id);
    }

    return false;
  }

  async canManageServer(userId, guild) {
    if (this.isSuperAdmin(userId)) {
      return {
        allowed: true,
        reason: 'super_admin'
      };
    }

    if (this.isServerOwner(userId, guild)) {
      return {
        allowed: true,
        reason: 'server_owner'
      };
    }

    const member = await guild.members.fetch(userId);

    if (this.hasAdminPermission(member)) {
      return {
        allowed: true,
        reason: 'administrator'
      };
    }

    if (this.hasManageServerPermission(member)) {
      return {
        allowed: true,
        reason: 'manage_server'
      };
    }

    return {
      allowed: false,
      reason: 'insufficient_permissions'
    };
  }

  async canManageEngagements(userId, guild) {
    const serverCheck = await this.canManageServer(userId, guild);
    if (serverCheck.allowed) {
      return serverCheck;
    }

    const member = await guild.members.fetch(userId);

    if (this.hasModeratorRole(member, guild.id)) {
      return {
        allowed: true,
        reason: 'moderator'
      };
    }

    return {
      allowed: false,
      reason: 'insufficient_permissions'
    };
  }

  async canGenerateAccessCodes(userId) {
    if (this.isSuperAdmin(userId)) {
      return {
        allowed: true,
        reason: 'super_admin'
      };
    }

    return {
      allowed: false,
      reason: 'super_admin_only'
    };
  }

  async canViewServerStats(userId, guild) {
    return await this.canManageEngagements(userId, guild);
  }

  async canManageRewards(userId, guild) {
    return await this.canManageServer(userId, guild);
  }

  async canModerateUsers(userId, guild) {
    const member = await guild.members.fetch(userId);

    if (this.isSuperAdmin(userId) || 
        this.isServerOwner(userId, guild) || 
        this.hasAdminPermission(member)) {
      return {
        allowed: true,
        reason: 'admin'
      };
    }

    if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return {
        allowed: true,
        reason: 'moderate_members'
      };
    }

    if (this.hasModeratorRole(member, guild.id)) {
      return {
        allowed: true,
        reason: 'moderator'
      };
    }

    return {
      allowed: false,
      reason: 'insufficient_permissions'
    };
  }

  async checkServerActive(guildId) {
    try {
      const server = db.serverQueries.getServer(db.connection, guildId);

      if (!server) {
        return {
          active: false,
          reason: 'not_registered'
        };
      }

      if (!server.is_active) {
        return {
          active: false,
          reason: 'deactivated'
        };
      }

      return {
        active: true
      };
    } catch (error) {
      logger.error('Error checking server active:', error);
      return {
        active: false,
        reason: 'error'
      };
    }
  }

  async checkServerHasAccessCode(guildId) {
    try {
      const server = db.serverQueries.getServer(db.connection, guildId);

      if (!server) {
        return {
          hasCode: false,
          reason: 'not_registered'
        };
      }

      if (!server.access_code) {
        return {
          hasCode: false,
          reason: 'no_code'
        };
      }

      return {
        hasCode: true,
        code: server.access_code
      };
    } catch (error) {
      logger.error('Error checking access code:', error);
      return {
        hasCode: false,
        reason: 'error'
      };
    }
  }

  getPermissionLevel(userId, guild, member) {
    if (this.isSuperAdmin(userId)) {
      return {
        level: 'super_admin',
        priority: 100
      };
    }

    if (this.isServerOwner(userId, guild)) {
      return {
        level: 'owner',
        priority: 90
      };
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return {
        level: 'administrator',
        priority: 80
      };
    }

    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return {
        level: 'manager',
        priority: 70
      };
    }

    if (this.hasModeratorRole(member, guild.id)) {
      return {
        level: 'moderator',
        priority: 60
      };
    }

    if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return {
        level: 'moderator_perm',
        priority: 50
      };
    }

    return {
      level: 'member',
      priority: 0
    };
  }
}

module.exports = new PermissionChecker();
