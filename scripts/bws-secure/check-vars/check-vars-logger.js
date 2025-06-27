#!/usr/bin/env node

/**
 * check-vars-logger.js
 * --------------------
 * A JavaScript wrapper for check-vars-availability.sh that uses the logger utility
 * This provides consistent logging formatting and can be called from the shell script
 *
 * Usage:
 *   node check-vars-logger.js [log_level] [message]
 */

import logger from '../logger.js';

const logLevel = process.argv[2] || 'info';
const message = process.argv.slice(3).join(' ');

// Validates the log level and uses a default if invalid
function validateLogLevel(level) {
  const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
  return validLevels.includes(level) ? level : 'info';
}

// Log the message with the specified log level
const level = validateLogLevel(logLevel);
logger[level](message);
