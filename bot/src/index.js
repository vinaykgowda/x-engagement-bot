// bot/src/index.js
import { Client, Collection, GatewayIntentBits, ActivityType } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import settings from './config/settings.js';
import logger from './config/logger.js';
import migrations from './database/migrations.js';
import dbConnection from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class XEngagementBot {
  constructor() {
    // Create Discord client
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Store commands
    this.client.commands = new Collection();

    // Store database reference
    this.client.db = null;
  }

  async initialize() {
    try {
      logger.info('🚀 Starting X Engagement Bot...');

      // Initialize database
      await migrations.initialize();
      this.client.db = dbConnection.getDatabase();
      logger.info('✓ Database initialized');

      // Load commands
      await this.loadCommands();
      logger.info(`✓ Loaded ${this.client.commands.size} commands`);

      // Load events
      await this.loadEvents();
      logger.info('✓ Event handlers loaded');

      // Login to Discord
      await this.client.login(settings.discord.token);

    } catch (error) {
      logger.error('Failed to initialize bot:', error);
      throw error;
    }
  }

  async loadCommands() {
    const commandFolders = ['admin', 'user', 'superadmin'];

    for (const folder of commandFolders) {
      const commandsPath = join(__dirname, 'commands', folder);

      try {
        const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
          const filePath = join(commandsPath, file);
          const command = await import(`file://${filePath}`);

          if ('data' in command && 'execute' in command) {
            this.client.commands.set(command.data.name, command);
            logger.debug(`Loaded command: ${command.data.name} (${folder})`);
          } else {
            logger.warn(`Command at ${file} is missing "data" or "execute" property`);
          }
        }
      } catch (error) {
        // Folder might not exist yet during initial setup
        logger.debug(`Command folder ${folder} not found or empty`);
      }
    }
  }

  async loadEvents() {
    const eventsPath = join(__dirname, 'events');

    try {
      const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

      for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        const event = await import(`file://${filePath}`);

        if (event.default) {
          const eventHandler = event.default;

          if (eventHandler.once) {
            this.client.once(eventHandler.name, (...args) =>
              eventHandler.execute(this.client, ...args)
            );
          } else {
            this.client.on(eventHandler.name, (...args) =>
              eventHandler.execute(this.client, ...args)
            );
          }

          logger.debug(`Loaded event: ${eventHandler.name}`);
        }
      }
    } catch (error) {
      logger.debug(`Events folder not found or empty`);
    }
  }

  async shutdown() {
    logger.info('Shutting down bot...');

    // Close database connection
    if (this.client.db) {
      dbConnection.close();
    }

    // Destroy Discord client
    await this.client.destroy();

    logger.info('Bot shutdown complete');
  }
}

// Create bot instance
const bot = new XEngagementBot();

// Handle shutdown signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await bot.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await bot.shutdown();
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the bot
bot.initialize().catch((error) => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});