/* eslint-disable no-console */
const logger = {
  // ANSI color codes
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  },

  // Map log levels to colors
  levelColors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'cyan'
  },

  error: function (message) {
    console.error(`${this.colors.red}[ERROR] ${message}${this.colors.reset}`);
  },

  warn: function (message) {
    console.warn(`${this.colors.yellow}[WARN] ${message}${this.colors.reset}`);
  },

  info: function (message) {
    console.log(`${this.colors.green}[INFO]${this.colors.reset} ${message}`);
  },

  debug: function (message) {
    // Only show debug messages if DEBUG=true
    if (process.env.DEBUG === 'true') {
      console.log(`${this.colors.blue}[DEBUG] ${message}${this.colors.reset}`);
    }
  },

  verbose: function (message) {
    console.log(`${this.colors.cyan}[VERBOSE] ${message}${this.colors.reset}`);
  },

  // Helper to colorize specific parts of a message
  colorize: function (text, color) {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  },

  // Format timestamps consistently
  formatTimestamp: function () {
    return new Date().toISOString();
  },

  // Enhanced log method that includes timestamps
  log: function (level, message) {
    // Skip debug messages if DEBUG isn't true
    if (level === 'debug' && process.env.DEBUG !== 'true') {
      return;
    }

    const timestamp = this.formatTimestamp();
    const color = this.levelColors[level] || 'reset';
    const formattedMessage = `[${timestamp}] ${this.colorize(
      `[${level.toUpperCase()}]`,
      color
    )} ${message}`;
    console.log(formattedMessage);
  }
};

export default logger;
