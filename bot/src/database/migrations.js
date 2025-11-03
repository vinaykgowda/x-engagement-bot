// ============================================================================
// FILE 2: bot/src/database/migrations.js
// ============================================================================

import dbConnection from '../config/database.js';
import { schema, indexes } from './schema.js';
import logger from '../config/logger.js';

class DatabaseMigrations {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      // Connect to database
      this.db = dbConnection.connect();

      logger.info('Starting database migrations...');

      // Run migrations
      await this.runMigrations();

      logger.info('Database migrations completed successfully');

      return true;
    } catch (error) {
      logger.error('Database migration failed:', error);
      throw error;
    }
  }

  async runMigrations() {
    // Create all tables
    const tables = Object.entries(schema);

    for (const [tableName, createStatement] of tables) {
      try {
        this.db.exec(createStatement);
        logger.info(`✓ Table created/verified: ${tableName}`);
      } catch (error) {
        logger.error(`Failed to create table ${tableName}:`, error);
        throw error;
      }
    }

    // Create indexes
    for (const indexStatement of indexes) {
      try {
        this.db.exec(indexStatement);
      } catch (error) {
        logger.error(`Failed to create index:`, error);
        // Don't throw - indexes are not critical
      }
    }

    logger.info(`✓ Created ${indexes.length} indexes`);
  }

  // Check if database is initialized
  isInitialized() {
    try {
      const result = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='global_users'")
        .get();
      return !!result;
    } catch (error) {
      return false;
    }
  }

  // Get database info
  getDatabaseInfo() {
    const tables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();

    const info = {
      tables: tables.map((t) => t.name),
      tableCount: tables.length,
    };

    // Get row counts for each table
    tables.forEach((table) => {
      try {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        info[table.name] = count.count;
      } catch (error) {
        info[table.name] = 'error';
      }
    });

    return info;
  }
}

// Export singleton instance
const migrations = new DatabaseMigrations();

export default migrations;

// If run directly, execute migrations
if (import.meta.url === `file://${process.argv[1]}`) {
  migrations
    .initialize()
    .then(() => {
      const info = migrations.getDatabaseInfo();
      console.log('\n📊 Database Information:');
      console.log('─'.repeat(50));
      console.log(`Total Tables: ${info.tableCount}`);
      console.log('\nTable Row Counts:');
      info.tables.forEach((table) => {
        console.log(`  ${table}: ${info[table]} rows`);
      });
      console.log('─'.repeat(50));
      console.log('✅ Database setup complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}