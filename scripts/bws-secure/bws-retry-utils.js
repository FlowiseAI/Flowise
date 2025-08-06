#!/usr/bin/env node

import { execSync } from 'node:child_process';

// Constants for retry delays
const RETRY_DELAYS = {
  INITIAL: 30000, // 30 seconds for general retries
  BITWARDEN: 70000, // 70 seconds for Bitwarden rate limits
  MAX_RETRIES: 3
};

/**
 * Check if the error text appears to be a 429 or "too many requests" error
 */
function isRateLimitError(errorText) {
  return /429|too\s+many\s+requests/i.test(errorText);
}

/**
 * Parse BWS error messages to extract meaningful information
 */
function parseBwsErrorMessage(rawErrorMessage) {
  let simplified = rawErrorMessage.trim();

  // Look for JSON error messages
  const MAX_JSON_LENGTH = 1000;
  const truncated = simplified.slice(0, MAX_JSON_LENGTH);
  const matchJSON = truncated.match(/\{[\s\S]+?\}/);

  if (matchJSON) {
    try {
      const errorObj = JSON.parse(matchJSON[0]);
      if (errorObj.message) {
        simplified = `Server responded with: "${errorObj.message}"`;
      }
    } catch {
      // If JSON parse fails, just keep going
    }
  }

  // Remove location/backtrace lines
  simplified = simplified
    .replace(/Location:.*?\n/g, '')
    .replace(/Backtrace omitted.*?\n/g, '')
    .replace(/Run with.*?\n/g, '');

  return simplified;
}

/**
 * Sleep function for retry delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Synchronous sleep using busy wait
 */
function sleepSync(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy-wait until delay time has elapsed
  }
}

/**
 * Log retry attempts with proper formatting
 */
function logRetryAttempt(attempt, maxRetries, delaySeconds, operation) {
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';

  console.log(`${yellow}╔${'═'.repeat(60)}╗${reset}`);
  console.log(`${yellow}║${' '.repeat(60)}║${reset}`);
  console.log(`${yellow}║         BWS RATE LIMIT DETECTED - RETRYING         ║${reset}`);
  console.log(`${yellow}║${' '.repeat(60)}║${reset}`);
  console.log(`${yellow}║  Operation: ${operation.padEnd(42)} ║${reset}`);
  console.log(`${yellow}║  Attempt: ${attempt}/${maxRetries}${' '.repeat(38)} ║${reset}`);
  console.log(`${yellow}║  Waiting: ${delaySeconds}s before retry${' '.repeat(25)} ║${reset}`);
  console.log(`${yellow}║${' '.repeat(60)}║${reset}`);
  console.log(`${yellow}║  Bitwarden requests limits detected. This is       ║${reset}`);
  console.log(`${yellow}║  normal for high-frequency operations. The build   ║${reset}`);
  console.log(`${yellow}║  will continue after the delay.                    ║${reset}`);
  console.log(`${yellow}║${' '.repeat(60)}║${reset}`);
  console.log(`${yellow}╚${'═'.repeat(60)}╝${reset}`);
}

/**
 * Handle rate limit error and determine if retry should continue
 */
function handleRateLimitError(parsedError, attempt, maxRetries, operationName) {
  if (!isRateLimitError(parsedError)) {
    return false; // Not a rate limit error, don't retry
  }

  const delayMs = parsedError.toLowerCase().includes('bitwarden')
    ? RETRY_DELAYS.BITWARDEN
    : RETRY_DELAYS.INITIAL;
  const delaySeconds = Math.floor(delayMs / 1000);

  logRetryAttempt(attempt, maxRetries, delaySeconds, operationName);

  return attempt < maxRetries ? delayMs : false;
}

/**
 * Execute a BWS command with retry logic for 429 errors
 */
export async function execBwsCommandWithRetry(
  command,
  options = {},
  operationName = 'BWS operation'
) {
  const maxRetries = RETRY_DELAYS.MAX_RETRIES;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute the command
      const result = execSync(command, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
        ...options
      });

      // Success - return result
      return result;
    } catch (error) {
      const errorOutput =
        error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      const parsedError = parseBwsErrorMessage(errorOutput);

      const delayMs = handleRateLimitError(parsedError, attempt, maxRetries, operationName);

      if (delayMs) {
        await sleep(delayMs);
        continue;
      }

      // If it's not a rate limit error, or we've exceeded max retries, throw error
      throw new Error(`Failed to execute BWS command after ${attempt} attempts: ${parsedError}`);
    }
  }
}

/**
 * Execute a synchronous BWS command with retry logic for 429 errors
 */
export function execBwsCommandWithRetrySync(
  command,
  options = {},
  operationName = 'BWS operation'
) {
  const maxRetries = RETRY_DELAYS.MAX_RETRIES;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute the command
      const result = execSync(command, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
        ...options
      });

      // Success - return result
      return result;
    } catch (error) {
      const errorOutput =
        error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      const parsedError = parseBwsErrorMessage(errorOutput);

      const delayMs = handleRateLimitError(parsedError, attempt, maxRetries, operationName);

      if (delayMs) {
        sleepSync(delayMs);
        continue;
      }

      // If it's not a rate limit error, or we've exceeded max retries, throw error
      throw new Error(`Failed to execute BWS command after ${attempt} attempts: ${parsedError}`);
    }
  }
}
