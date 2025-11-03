// ============================================================================
// FILE 3: bot/src/config/logger.js
// ============================================================================

import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '../../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // All logs
    new winston.transports.File({
      filename: join(logsDir, 'bot.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Error logs
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add helper methods
logger.command = (commandName, userId, guildId) => {
  logger.info(`Command: /${commandName} | User: ${userId} | Guild: ${guildId}`);
};

logger.engagement = (action, details) => {
  logger.info(`Engagement ${action}: ${JSON.stringify(details)}`);
};

logger.reward = (action, userId, amount, type) => {
  logger.info(`Reward ${action}: User ${userId} | Amount: ${amount} ${type}`);
};

logger.raid = (action, details) => {
  logger.info(`Raid ${action}: ${JSON.stringify(details)}`);
};

export default logger;