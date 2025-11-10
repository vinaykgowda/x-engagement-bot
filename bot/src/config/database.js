// ============================================================================
// FILE 2: bot/src/config/database.js
// ============================================================================

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import settings from './settings.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseConnection {
  constructor() {
    this.db = null;
  }

  connect() {
    try {
      // Resolve database path - fixed to stay within project
      // From bot/src/config/ go up to bot/, then to database path
      const dbPath = join(__dirname, '../..', settings.database.path);
      const dbDir = dirname(dbPath);

      // Ensure database directory exists
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
        logger.info(`Created database directory: ${dbDir}`);
      }

      // Create database connection
      this.db = new Database(dbPath, {
        verbose: settings.env === 'development' ? logger.debug.bind(logger) : null,
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Set WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      logger.info(`Database connected: ${dbPath}`);

      return this.db;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  // Helper method to run queries in a transaction
  transaction(callback) {
    const transaction = this.db.transaction(callback);
    return transaction;
  }

  // Backup database
  backup(backupPath) {
    try {
      this.db.backup(backupPath);
      logger.info(`Database backed up to: ${backupPath}`);
      return true;
    } catch (error) {
      logger.error('Database backup failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection;