/* eslint-disable no-console */
/**
 * utils.js
 *
 * Provides shared helper functions used by both Netlify and Vercel modules, as well
 * as the updateEnvVars.js entry point. This includes logging, error handling, reading .env
 * files, variable validation, and other common utilities.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Logs a message with a specific log level and timestamp.
 * Supports optional metadata object for additional context.
 *
 * @param {string} level - The log level: "info", "debug", "warn", or "error"
 * @param {string} message - The log message
 * @param {Object} [metadata] - Optional metadata to include in the log
 */
function log(level, message) {
  // Only show info, warn and error logs by default
  if (level === 'debug' && !process.env.DEBUG) {
    return;
  }

  const colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m', // Yellow
    info: '\x1b[32m', // Green
    debug: '\x1b[34m', // Blue
    verbose: '\x1b[36m' // Cyan
  };

  const colorCode = colors[level] || '';
  const resetCode = '\x1b[0m';
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${colorCode}[${level.toUpperCase()}]${resetCode} ${message}`);
}

/**
 * Handles errors by logging them and optionally terminating the process.
 * Provides more context in development environment.
 *
 * @param {Error} error - The error thrown
 * @param {string} message - Additional context for the error
 * @param {boolean} [fatal=true] - Whether to exit process
 */
function handleError(error, message, fatal = true) {
  const errorContext = {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    response: error.response?.data,
    status: error.response?.status
  };

  log('error', `${message}: ${error.message}`, errorContext);

  if (fatal) {
    process.exit(1);
  }
}

/**
 * Reads and parses lines in a .env file, returning an array of non-comment lines.
 *
 * @param {string} filePath - The path to the .env file
 * @returns {Promise<string[]>} Array of env file lines containing KEY=VALUE
 */
async function readEnvFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const lines = [];

    data.split('\n').forEach((line) => {
      const trimmed = line.trim();
      // Ignore blank lines and comment lines
      if (trimmed && !trimmed.startsWith('#')) {
        lines.push(trimmed);
      }
    });
    log('debug', `Read env file ${filePath} with ${lines.length} lines of data.`);
    return lines;
  } catch (error) {
    handleError(error, `Failed to read required vars file at ${filePath}`);
  }
}

/**
 * Returns a Netlify auth token from the environment or secure files
 */
function getBuildOrAuthToken() {
  try {
    // For platform tokens, always check both dev and prod files first
    if (!process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY === 'true') {
      const prodFile = '.env.secure.prod';
      const devFile = '.env.secure.dev';

      // Try prod file first
      if (fs.existsSync(prodFile)) {
        try {
          const prodVars = decryptContent(
            fs.readFileSync(prodFile, 'utf-8'),
            process.env.BWS_EPHEMERAL_KEY
          );
          const token = prodVars
            .split('\n')
            .find((line) => line.startsWith('NETLIFY_AUTH_TOKEN='))
            ?.split('=')[1];
          if (token) {
            log('debug', 'Found Netlify token in prod vars');
            process.env.NETLIFY_AUTH_TOKEN = token.trim();
            return `Bearer ${token.trim()}`;
          }
        } catch (error) {
          log('warn', `Failed to decrypt prod vars: ${error.message}`);
        }
      }

      // If not found in prod, try dev file
      if (!process.env.NETLIFY_AUTH_TOKEN && fs.existsSync(devFile)) {
        try {
          const devVars = decryptContent(
            fs.readFileSync(devFile, 'utf-8'),
            process.env.BWS_EPHEMERAL_KEY
          );
          const token = devVars
            .split('\n')
            .find((line) => line.startsWith('NETLIFY_AUTH_TOKEN='))
            ?.split('=')[1];
          if (token) {
            log('debug', 'Found Netlify token in dev vars');
            process.env.NETLIFY_AUTH_TOKEN = token.trim();
            return `Bearer ${token.trim()}`;
          }
        } catch (error) {
          log('warn', `Failed to decrypt dev vars: ${error.message}`);
        }
      }
    }

    // If we already have a token in the environment, use that
    const buildToken = process.env.NETLIFY_API_TOKEN;
    const authToken = process.env.NETLIFY_AUTH_TOKEN;
    const token = buildToken || authToken;

    if (!token) {
      throw new Error(
        'Neither NETLIFY_API_TOKEN nor NETLIFY_AUTH_TOKEN available. ' +
          'Please set one of these environment variables.'
      );
    }

    // If token already includes 'Bearer', return as is
    if (token.startsWith('Bearer ')) {
      return token;
    }

    return `Bearer ${token}`;
  } catch (error) {
    log('error', `Failed to get Netlify token: ${error.message}`);
    throw error;
  }
}

/**
 * Determines if a variable should be preserved (not deleted) based on its name
 * and the project configuration.
 *
 * @param {string} variableName - The environment variable name
 * @param {Object} project - Project configuration object
 * @returns {boolean} True if the variable should be preserved
 */
function shouldPreserveVar(variableName, project) {
  // Critical variables that should always be preserved
  if (variableName === 'BWS_ACCESS_TOKEN' || variableName === 'SITE_NAME') {
    return true;
  }

  // Check project-specific preserveVars array
  if (project && project.preserveVars && Array.isArray(project.preserveVars)) {
    return project.preserveVars.includes(variableName);
  }

  return false;
}

/**
 * Validates the value of a given environment variable, applying basic checks based
 * on the type of variable name (e.g., tokens, URLs, etc.).
 *
 * @param {string} key - The environment variable name
 * @param {string} value - The environment variable value
 * @returns {Object} result with properties { isValid: boolean, error?: string, value: string }
 */
function validateValue(key, value) {
  // Remove any surrounding quotes and whitespace
  value = value.replace(/^['"]|['"]$/g, '').trim();

  if (!value) {
    return { isValid: false, error: 'Empty value' };
  }

  // If it's some kind of token, check length and format
  if (key.toUpperCase().includes('TOKEN')) {
    if (value.length < 10) {
      return { isValid: false, error: 'Token seems too short (min 10 chars)' };
    }
    // Basic format check for common token patterns
    if (!value.match(/^[A-Za-z0-9_\-\.]+$/)) {
      return {
        isValid: false,
        error: 'Token contains invalid characters (should be alphanumeric with _ - .)'
      };
    }
  }

  // If it's a URL, attempt to parse and validate
  if (key.toUpperCase().includes('URL')) {
    try {
      const url = new URL(value);
      // Additional URL validation
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { isValid: false, error: 'URL must use http or https protocol' };
      }
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  // If it's an API endpoint, ensure it starts with http(s)://
  if (key.toUpperCase().includes('API') || key.toUpperCase().includes('ENDPOINT')) {
    if (!value.match(/^https?:\/\//)) {
      return {
        isValid: false,
        error: 'API/Endpoint must start with http:// or https://'
      };
    }
  }

  return { isValid: true, value: value.trim() };
}

/**
 * Determines which environment variables to use based on context
 * @param {Object} project - Project configuration from bwsconfig.json
 * @returns {Object} Environment mapping configuration
 */
function determineEnvironmentMapping(project) {
  let environment = 'dev'; // Default to dev environment

  // For Netlify, handle specific contexts
  if (process.env.NETLIFY === 'true') {
    if (process.env.CONTEXT === 'production') {
      environment = 'prod';
    } else if (process.env.CONTEXT === 'deploy-preview' && project.bwsProjectIds.deploy_preview) {
      environment = 'deploy_preview';
    } else if (process.env.CONTEXT === 'branch-deploy' && project.bwsProjectIds.branch_deploy) {
      environment = 'branch_deploy';
    }
    log('debug', `Using ${environment} environment for Netlify ${process.env.CONTEXT} context`);
  }
  // For Vercel, keep existing logic
  else if (process.env.VERCEL === '1') {
    environment = process.env.VERCEL_ENV === 'production' ? 'prod' : 'dev';
  }
  // For local development
  else if (process.env.BWS_ENV && project.bwsProjectIds[process.env.BWS_ENV]) {
    environment = process.env.BWS_ENV;
  }

  const mapping = {
    environment,
    source: `.env.secure.${environment}`,
    contexts: environment === 'prod' ? ['production'] : ['deploy-preview', 'branch-deploy', 'dev']
  };

  log('debug', `Environment mapping: ${JSON.stringify(mapping)}`);
  return mapping;
}

/**
 * Loads environment variables from the appropriate secure file
 * @param {string} filePath - Path to the secure environment file
 * @param {string} encryptionKey - Key for decrypting the file
 * @returns {Object} Decrypted environment variables
 */
function loadEnvironmentVariables(filePath, encryptionKey) {
  try {
    // Add environment-specific key logging
    const envType = filePath.includes('.prod')
      ? 'prod'
      : filePath.includes('.dev')
      ? 'dev'
      : filePath.includes('.local')
      ? 'local'
      : 'unknown';

    log('debug', `Loading ${envType} environment from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      log('debug', `Environment file not found: ${filePath}`);
      return null;
    }

    const encryptedText = fs.readFileSync(filePath, 'utf-8');
    if (!encryptedText) {
      log('warn', `Empty file: ${filePath}`);
      return null;
    }

    // Log environment-specific key details
    log('debug', {
      environment: envType,
      keyAvailable: Boolean(encryptionKey),
      keyLength: encryptionKey?.length,
      filePath
    });

    const decrypted = decryptContent(encryptedText, encryptionKey);
    if (!decrypted) {
      log('warn', 'Decryption returned empty result');
      return null;
    }

    // Parse the decrypted content into an object
    const vars = {};
    decrypted.split('\n').forEach((line) => {
      const [k, ...rest] = line.split('=');
      if (k && rest.length > 0) {
        const key = k.trim();
        const value = rest.join('=').trim();
        vars[key] = value;
      }
    });

    return vars;
  } catch (error) {
    log('error', `Failed to load environment variables: ${error.message}`);
    return null;
  }
}

function decryptContent(encrypted, encryptionKey) {
  try {
    log('debug', '=== Decryption Debug ===');
    log('debug', `Raw encrypted length: ${encrypted.length}`);
    // Only show first 20 chars of encrypted data, not the full value
    log('debug', `Raw encrypted start: ${encrypted.substring(0, 20)}...`);

    const [ivBase64, authTagBase64, data] = encrypted.split(':');
    log('debug', `IV (base64) length: ${ivBase64?.length}`);
    log('debug', `Auth tag length: ${authTagBase64?.length}`);
    log('debug', `Data (base64) length: ${data?.length}`);

    if (!ivBase64 || !authTagBase64 || !data) {
      throw new Error(
        `Invalid encrypted content format - IV: ${Boolean(ivBase64)}, Data: ${Boolean(data)}`
      );
    }

    const iv = Buffer.from(ivBase64, 'base64');
    if (!encryptionKey) {
      throw new Error('No encryption key provided');
    }

    const keyBuffer = Buffer.from(encryptionKey, 'hex');
    log('debug', {
      ivLength: iv.length,
      keyLength: keyBuffer.length,
      keyFirstBytes: keyBuffer.slice(0, 4).toString('hex'),
      ivFirstBytes: iv.slice(0, 4).toString('hex'),
      isValidHex: /^[0-9a-f]+$/i.test(encryptionKey)
    });

    const authTag = Buffer.from(authTagBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    log('debug', 'Decryption successful!');
    log('debug', `Decrypted length: ${decrypted.length}`);
    return decrypted;
  } catch (error) {
    log('error', `Decryption failed: ${error.message}`);
    throw error;
  }
}

/**
 * Validates deployment settings for platforms by checking required environment variables.
 *
 * @param {Object} project - Project configuration object
 * @returns {Object} - Object with isValid flag and error message if invalid
 */
function validateDeployment(project) {
  const isNetlify = process.env.NETLIFY === 'true';
  const isVercel = process.env.VERCEL === '1';
  const isPlatform = isNetlify || isVercel;

  // CRITICAL: Always require SITE_NAME for platform builds
  if (isPlatform && !process.env.SITE_NAME) {
    return {
      isValid: false,
      error: `Critical Error: SITE_NAME environment variable is required for platform deployments`
    };
  }

  // For Netlify projects, we need to validate the authentication token
  if (
    isPlatform &&
    project.platform.toLowerCase() === 'netlify' &&
    isNetlify &&
    !process.env.NETLIFY_AUTH_TOKEN
  ) {
    return {
      isValid: false,
      error: 'Missing NETLIFY_AUTH_TOKEN environment variable'
    };
  }

  // For Vercel projects, we need to validate the authentication token
  if (
    isPlatform &&
    project.platform.toLowerCase() === 'vercel' &&
    isVercel &&
    !process.env.VERCEL_AUTH_TOKEN
  ) {
    return {
      isValid: false,
      error: 'Missing VERCEL_AUTH_TOKEN environment variable'
    };
  }

  if (process.env.NETLIFY === 'true' && project.platform.toLowerCase() !== 'netlify') {
    return {
      isValid: false,
      error: `Project ${project.projectName} is not configured for Netlify (${project.platform})`
    };
  }

  if (process.env.VERCEL === '1' && project.platform.toLowerCase() !== 'vercel') {
    return {
      isValid: false,
      error: `Project ${project.projectName} is not configured for Vercel (${project.platform})`
    };
  }

  return { isValid: true };
}

/**
 * Gets the bwsconfig.json path, checking multiple possible locations
 * @returns {string} Path to bwsconfig.json
 */
function getBwsConfigPath() {
  // Try current working directory first (./bwsconfig.json)
  const cwdPath = path.join(process.cwd(), 'bwsconfig.json');
  if (fs.existsSync(cwdPath)) {
    log('debug', `Found bwsconfig.json at: ${cwdPath}`);
    return cwdPath;
  }

  // Try relative to script location (./scripts/bws-secure/bwsconfig.json)
  const scriptPath = path.join(__dirname, '..', 'bwsconfig.json');
  if (fs.existsSync(scriptPath)) {
    log('debug', `Found bwsconfig.json at: ${scriptPath}`);
    return scriptPath;
  }

  // Try one level up from script (./scripts/bwsconfig.json)
  const scriptParentPath = path.join(__dirname, '..', '..', 'bwsconfig.json');
  if (fs.existsSync(scriptParentPath)) {
    log('debug', `Found bwsconfig.json at: ${scriptParentPath}`);
    return scriptParentPath;
  }

  log(
    'debug',
    `Searched paths:
    - ${cwdPath}
    - ${scriptPath}
    - ${scriptParentPath}`
  );
  throw new Error('Could not find bwsconfig.json in any expected location');
}

export {
  log,
  handleError,
  readEnvFile,
  getBuildOrAuthToken,
  shouldPreserveVar,
  validateValue,
  determineEnvironmentMapping,
  loadEnvironmentVariables,
  decryptContent,
  validateDeployment,
  getBwsConfigPath
};
