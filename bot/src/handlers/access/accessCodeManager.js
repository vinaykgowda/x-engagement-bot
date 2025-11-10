import crypto from 'crypto';
import db from '../../database/queries.js';
import logger from '../../config/logger.js';

class AccessCodeManager {
  constructor() {
    this.codeLength = 12;
  }

  generateCode() {
    return crypto.randomBytes(this.codeLength).toString('hex').toUpperCase().substring(0, this.codeLength);
  }

  async createAccessCode(generatedBy, expiresInHours = null) {
    try {
      const code = this.generateCode();
      const expiresAt = expiresInHours ? Date.now() + (expiresInHours * 60 * 60 * 1000) : null;
      const now = Date.now();

      db.connection.prepare(`
        INSERT INTO server_access_codes (code, generated_by, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(code, generatedBy, expiresAt, now);

      logger.info(`Access code created: ${code} by ${generatedBy}`);

      return {
        success: true,
        code,
        expiresAt
      };
    } catch (error) {
      logger.error('Error creating access code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateCode(code) {
    try {
      const accessCode = db.connection.prepare(
        'SELECT * FROM server_access_codes WHERE code = ?'
      ).get(code);

      if (!accessCode) {
        return {
          valid: false,
          reason: 'Code not found'
        };
      }

      if (accessCode.is_used) {
        return {
          valid: false,
          reason: 'Code already used',
          usedByGuild: accessCode.used_by_guild
        };
      }

      if (accessCode.expires_at && Date.now() > accessCode.expires_at) {
        return {
          valid: false,
          reason: 'Code expired'
        };
      }

      return {
        valid: true,
        code: accessCode
      };
    } catch (error) {
      logger.error('Error validating code:', error);
      return {
        valid: false,
        reason: error.message
      };
    }
  }

  async useCode(code, guildId) {
    try {
      const validation = await this.validateCode(code);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason
        };
      }

      db.connection.prepare(`
        UPDATE server_access_codes
        SET is_used = 1, used_by_guild = ?
        WHERE code = ?
      `).run(guildId, code);

      db.connection.prepare(`
        UPDATE servers
        SET access_code = ?
        WHERE guild_id = ?
      `).run(code, guildId);

      logger.info(`Access code ${code} used by guild ${guildId}`);

      return {
        success: true,
        code
      };
    } catch (error) {
      logger.error('Error using access code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async revokeCode(code) {
    try {
      const result = db.connection.prepare(
        'DELETE FROM server_access_codes WHERE code = ?'
      ).run(code);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'Code not found'
        };
      }

      logger.info(`Access code revoked: ${code}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error revoking code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listCodes(options = {}) {
    try {
      let query = 'SELECT * FROM server_access_codes WHERE 1=1';
      const params = [];

      if (options.unused) {
        query += ' AND is_used = 0';
      }

      if (options.generatedBy) {
        query += ' AND generated_by = ?';
        params.push(options.generatedBy);
      }

      query += ' ORDER BY created_at DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      const codes = db.connection.prepare(query).all(...params);

      return {
        success: true,
        codes
      };
    } catch (error) {
      logger.error('Error listing codes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanupExpired() {
    try {
      const now = Date.now();
      const result = db.connection.prepare(`
        DELETE FROM server_access_codes
        WHERE expires_at IS NOT NULL AND expires_at < ? AND is_used = 0
      `).run(now);

      if (result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} expired access codes`);
      }

      return {
        success: true,
        removed: result.changes
      };
    } catch (error) {
      logger.error('Error cleaning up expired codes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AccessCodeManager();
