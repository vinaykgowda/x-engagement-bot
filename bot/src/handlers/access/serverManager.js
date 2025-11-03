const db = require('../../database/queries');
const logger = require('../../config/logger');

class ServerManager {
  async registerServer(guildId, guildName, accessCode = null) {
    try {
      const now = Date.now();

      db.serverQueries.upsertServer(db.connection, guildId, guildName);

      db.connection.prepare(`
        INSERT INTO server_config (guild_id, created_at, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO NOTHING
      `).run(guildId, now, now);

      if (accessCode) {
        db.connection.prepare(`
          UPDATE servers SET access_code = ? WHERE guild_id = ?
        `).run(accessCode, guildId);
      }

      logger.info(`Server registered: ${guildId} (${guildName})`);

      return {
        success: true,
        guildId
      };
    } catch (error) {
      logger.error('Error registering server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getServer(guildId) {
    try {
      const server = db.serverQueries.getServer(db.connection, guildId);

      if (!server) {
        return {
          success: false,
          error: 'Server not found'
        };
      }

      return {
        success: true,
        server
      };
    } catch (error) {
      logger.error('Error getting server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getServerConfig(guildId) {
    try {
      const config = db.serverQueries.getConfig(db.connection, guildId);

      return {
        success: true,
        config: config || {}
      };
    } catch (error) {
      logger.error('Error getting server config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateServerConfig(guildId, updates) {
    try {
      const result = db.serverQueries.updateConfig(db.connection, guildId, updates);

      logger.info(`Server config updated: ${guildId}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error updating server config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async activateServer(guildId) {
    try {
      db.connection.prepare(`
        UPDATE servers SET is_active = 1, updated_at = ? WHERE guild_id = ?
      `).run(Date.now(), guildId);

      logger.info(`Server activated: ${guildId}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error activating server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deactivateServer(guildId) {
    try {
      db.connection.prepare(`
        UPDATE servers SET is_active = 0, updated_at = ? WHERE guild_id = ?
      `).run(Date.now(), guildId);

      logger.info(`Server deactivated: ${guildId}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error deactivating server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listServers(options = {}) {
    try {
      let query = 'SELECT * FROM servers WHERE 1=1';
      const params = [];

      if (options.activeOnly) {
        query += ' AND is_active = 1';
      }

      query += ' ORDER BY created_at DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      const servers = db.connection.prepare(query).all(...params);

      return {
        success: true,
        servers
      };
    } catch (error) {
      logger.error('Error listing servers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getServerStats(guildId) {
    try {
      const stats = {
        totalUsers: db.connection.prepare(
          'SELECT COUNT(DISTINCT user_id) as count FROM server_points WHERE guild_id = ?'
        ).get(guildId)?.count || 0,

        totalPoints: db.connection.prepare(
          'SELECT SUM(total_points) as sum FROM server_points WHERE guild_id = ?'
        ).get(guildId)?.sum || 0,

        totalEngagements: db.connection.prepare(
          'SELECT COUNT(*) as count FROM server_engagements WHERE guild_id = ?'
        ).get(guildId)?.count || 0,

        activeEngagements: db.connection.prepare(
          'SELECT COUNT(*) as count FROM server_engagements WHERE guild_id = ? AND is_active = 1'
        ).get(guildId)?.count || 0
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      logger.error('Error getting server stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async removeServer(guildId) {
    try {
      db.connection.prepare('DELETE FROM servers WHERE guild_id = ?').run(guildId);

      logger.info(`Server removed: ${guildId}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error removing server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ServerManager();
