#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * upload-secrets.js
 *
 * Tool for uploading secrets to Bitwarden Secrets Manager
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import readline from 'node:readline';
import { promises as fsPromises } from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get BWS organization ID with fallback
function getBwsOrgId() {
  return process.env.BWS_ORG_ID || 'YOUR_BWS_ORG_ID_HERE';
}

// Helper function to get BWS machine accounts URL
function getMachineAccountsUrl() {
  const orgId = getBwsOrgId();
  if (orgId === 'YOUR_BWS_ORG_ID_HERE') {
    return "\nPlease set BWS_ORG_ID environment variable to access your organization's machine accounts.\n";
  }
  return `\nhttps://vault.bitwarden.com/#/sm/${orgId}/machine-accounts\n`;
}

// Helper function to get BWS project secrets URL
function getProjectSecretsUrl(projectId) {
  const orgId = getBwsOrgId();
  if (orgId === 'YOUR_BWS_ORG_ID_HERE') {
    return `\nPlease set BWS_ORG_ID environment variable to access project ${projectId} secrets.\n`;
  }
  return `https://vault.bitwarden.com/#/sm/${orgId}/projects/${projectId}/secrets`;
}

// 1. Attempt to load a local .env (same directory)
const localEnvPath = path.join(__dirname, '.env');

// 2. If no local .env, try the root .env (adjust path depth to your repo)
const rootEnvPath = path.join(__dirname, '../../../.env');

// Check for and load whichever .env file we find
if (fs.existsSync(localEnvPath)) {
  console.log(`Loading environment from local .env at: ${localEnvPath}`);
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  console.log(`Loading environment from root .env at: ${rootEnvPath}`);
  dotenv.config({ path: rootEnvPath });
} else {
  console.log('No local or root .env file found. Relying on existing environment variables.');
}

// Automatically determine the folder of the script
const folderPath = path.dirname(__filename);

// Add near the top with other constants
const EXCLUDED_VARS = ['BWS_ACCESS_TOKEN'];
const DEBUG = process.env.DEBUG === 'true';

// Update the rate limit handling constants
const RATE_LIMIT_DELAYS = {
  FIRST: 65_000, // 65 seconds (in milliseconds)
  BETWEEN_FILES: 30_000, // 30 seconds between files
  BETWEEN_OPERATIONS: 15_000, // 15 seconds between delete/upload operations
  BETWEEN_DELETES: 500 // Reduce from 2000ms to 500ms - still safe but much faster
};

function debug(message, command = '') {
  if (DEBUG) {
    console.log('\x1b[34m[DEBUG]\x1b[0m', message);
    if (command) {
      console.log('\x1b[34m[CMD]\x1b[0m', command);
    }
  }
}

// Function to sanitize and escape environment variable values
const sanitizeValue = (value) => {
  // Remove surrounding single or double quotes if present
  const unquotedValue = value.replace(/^['"]|['"]$/g, '');
  // Escape backslashes first, then double quotes within the value
  const escapedValue = unquotedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedValue}"`;
};

/**
 * Creates a colored ASCII box that fits any number of lines.
 * @param {string[]} lines   Lines of text to display inside the box
 * @param {string} colorCode ANSI color code (e.g., "\x1b[92m" for green, "\x1b[31m" for red)
 */
function createBox(lines, colorCode) {
  // Find the longest line to set box width
  let maxLen = 0;
  lines.forEach((line) => {
    if (line.length > maxLen) {
      maxLen = line.length;
    }
  });
  // Build top/bottom borders
  const top = '┌' + '─'.repeat(maxLen + 2) + '┐';
  const bottom = '└' + '─'.repeat(maxLen + 2) + '┘';

  // Print the box in the specified color
  console.log(colorCode + top);
  lines.forEach((line) => {
    // Pad each line so they are all the same width
    const paddedLine = line.padEnd(maxLen, ' ');
    console.log(`│ ${paddedLine} │`);
  });
  console.log(bottom + '\x1b[0m'); // reset color at the end
}

function createErrorBox(lines) {
  // Red color
  createBox(lines, '\x1b[31m');
}

function createSuccessBox(successes, uploadResults) {
  // Create header lines using the passed parameters
  const headerLines = [
    '',
    `SUCCESS! ${successes.length} of ${uploadResults.length} file(s) uploaded correctly.`,
    '',
    'Successfully uploaded the below project ID(s).',
    'Visit the management URLs below to verify the uploaded contents:',
    ''
  ];

  // Find max width for the box
  const maxLen = Math.max(...headerLines.map((line) => line.length));

  // Build box borders
  const top = '┌' + '─'.repeat(maxLen + 2) + '┐';
  const bottom = '└' + '─'.repeat(maxLen + 2) + '┘';

  // Print header box
  console.log('\x1b[92m'); // Start green color
  console.log(top);
  headerLines.forEach((line) => {
    const paddedLine = line.padEnd(maxLen, ' ');
    console.log(`│ ${paddedLine} │`);
  });
  console.log(bottom);

  // Print project IDs and URLs below
  console.log(''); // Add spacing
  successes.forEach((s) => {
    console.log(`Project ID: ${s.projectId} (${s.count} secrets)`);
    console.log(getProjectSecretsUrl(s.projectId));
    console.log(''); // Add spacing between projects
  });

  console.log('\x1b[0m'); // Reset color
}

/**
 * Print a bright red error message, then exit.
 */
function showErrorAndExit(msg) {
  console.error(`\x1b[31m${msg}\x1b[0m`);
  process.exit(1);
}

/**
 * Attempt to parse and simplify the BWS error message that often includes Rust stack traces.
 * We remove location references, backtrace hints, etc., and if there is JSON with "message",
 * we extract that for a cleaner final output.
 */
function parseBwsErrorMessage(rawErrorMessage) {
  let simplified = rawErrorMessage.trim();

  // Use a non-greedy, more specific regex pattern to find JSON
  // Limit the JSON search to reasonable size and complexity
  const MAX_JSON_LENGTH = 1000; // Reasonable limit for error messages
  const truncated = simplified.slice(0, MAX_JSON_LENGTH);

  // Use a more specific pattern that won't cause catastrophic backtracking
  // [\s\S] is used instead of . to match newlines, and +? makes it non-greedy
  // NOSONAR: Safe regex pattern with size limit and non-greedy matching
  /* sonar-disable-next-line sonar:S5852 */
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

  // Remove any location/backtrace lines
  simplified = simplified
    .replace(/Location:.*?\n/g, '')
    .replace(/Backtrace omitted.*?\n/g, '')
    .replace(/Run with.*?\n/g, '');

  return simplified;
}

// Track how many times we've been rate-limited:
let timesRateLimited = 0;

/**
 * Sleep synchronously for the given milliseconds (blocks Node's event loop).
 * For a script like this, blocking is usually acceptable.
 */
function syncSleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy-wait until ms have elapsed
  }
}

/**
 * Check if the error text appears to be a 429 or "too many requests".
 */
function isRateLimitError(errorText) {
  return /429|too\s+many\s+requests/i.test(errorText);
}

/**
 * Generic rate limit handler that can be used for both delete and upload operations
 */
async function handleRateLimit(operation = 'operation') {
  console.log(`\x1b[33mRate-limit detected during ${operation}; sleeping 65 seconds...\x1b[0m`);

  const waitTime = RATE_LIMIT_DELAYS.FIRST;
  const startTime = Date.now();
  const endTime = startTime + waitTime;

  while (Date.now() < endTime) {
    const remainingSeconds = Math.ceil((endTime - Date.now()) / 1000);
    process.stdout.write(`\r\x1b[33mWaiting... ${remainingSeconds} seconds remaining\x1b[0m`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  process.stdout.write('\n');
}

/**
 * Delete a single secret with retry logic
 */
async function deleteSecretWithRetry(secret, projectId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const deleteCmd = `./node_modules/.bin/bws secret delete --output none -t ${process.env.BWS_ACCESS_TOKEN} ${secret.id}`;
      debug(`Deleting secret ${secret.key} with command:`, deleteCmd);

      execSync(deleteCmd, { stdio: 'pipe' });
      console.log(`Deleted secret: ${secret.key}`);

      // Only add small delay if there are more secrets to delete
      if (attempt === maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAYS.BETWEEN_DELETES));
      }
      return;
    } catch (deleteError) {
      const prettyError = parseBwsErrorMessage(deleteError.message);

      if (isRateLimitError(prettyError) && attempt < maxRetries) {
        await handleRateLimit('delete');
        continue;
      }
      throw deleteError;
    }
  }
}

// Update the clearProjectSecrets function
async function clearProjectSecrets(projectId) {
  try {
    console.log(`\nClearing existing secrets for project: ${projectId}...`);

    const listCmd = `./node_modules/.bin/bws secret list -o json -t ${process.env.BWS_ACCESS_TOKEN} ${projectId}`;
    debug('Listing secrets with command:', listCmd);

    try {
      const result = execSync(listCmd, { encoding: 'utf8' });
      debug('List command result:', result);
      const secrets = JSON.parse(result || '[]');
      debug(`Found ${secrets.length} secrets to delete`);

      if (secrets.length === 0) {
        console.log('\x1b[36m'); // Cyan color
        console.log('----------------------------------------');
        console.log(`Project ID: ${projectId}`);
        console.log('Status: No existing secrets to clear');
        console.log('----------------------------------------');
        console.log('\x1b[0m'); // Reset color
        return;
      }

      // Delete each secret with retry logic
      for (const secret of secrets) {
        await deleteSecretWithRetry(secret, projectId);
      }

      console.log(`Cleared ${secrets.length} secrets from project ${projectId}`);

      // Add delay after clearing before starting uploads
      console.log(
        `Waiting ${RATE_LIMIT_DELAYS.BETWEEN_OPERATIONS / 1000} seconds before starting uploads...`
      );
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAYS.BETWEEN_OPERATIONS));
    } catch (listError) {
      // If we get a 404, it means no secrets exist - that's okay
      if (listError.message.includes('404 Not Found')) {
        console.log('\x1b[33m'); // Yellow color
        console.log('=========================================================');
        console.log('No secrets found for this project (404).');
        console.log('This could mean:');
        console.log('  • Project is empty');
        console.log('  • Project was recently cleared');
        console.log('  • Project ID might be incorrect');
        console.log('');
        console.log(`Verify the BWS ProjectID at the following URL: ${projectId}`);
        console.log('');
        console.log(getProjectSecretsUrl(projectId));
        console.log('');
        console.log('Will continue with upload in 10 seconds...');
        console.log('Press Ctrl+C to cancel if something looks wrong.');
        console.log('=========================================================');
        console.log('\x1b[0m'); // Reset color

        // Wait 10 seconds
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return;
      }
      throw listError;
    }
  } catch (error) {
    debug('Clear project secrets error:', error.message);
    throw new Error(`Failed to clear secrets for project ${projectId}: ${error.message}`);
  }
}

// Move these functions to before they're used
function warnEmptyValue(key, value, file) {
  console.log(
    `\x1b[31mWarning: Empty or unresolved variable "${key}" in ${file}${
      value ? `: '${value}'` : ''
    }\x1b[0m`
  );
}

function transformEnvFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = dotenv.parse(fileContent);
    const filename = path.basename(filePath);

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key]) => !EXCLUDED_VARS.includes(key))
        .map(([key, value]) => {
          // Check for empty values before interpolation
          if (!value || value.trim() === '') {
            warnEmptyValue(key, null, filename);
            return [key, ''];
          }

          // Let dotenv handle the variable interpolation
          const interpolated = value.replace(/\${([^}]+)}/g, (match, varName) => {
            const resolvedValue = parsed[varName] || '';
            if (!resolvedValue) {
              warnEmptyValue(key, value, filename);
            }
            return resolvedValue || match;
          });
          return [key, interpolated];
        })
    );
  } catch (error) {
    console.error(`Failed to transform ${filePath}:`, error.message);
    throw error;
  }
}

function uploadSecretWithRetry(key, sanitizedValue, projectId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // NOSONAR: BWS CLI execution with controlled token and sanitized values - no user input
      /* sonar-disable-next-line sonar:S4721 */
      const cmd = `./node_modules/.bin/bws secret create -t ${process.env.BWS_ACCESS_TOKEN} ${key} -- ${sanitizedValue} ${projectId}`;
      debug(`Attempt ${attempt}: Creating secret ${key} with command:`, cmd);

      execSync(cmd, { stdio: 'pipe' });
      return;
    } catch (execError) {
      const rawErrorOutput = execError.stderr?.toString() || execError.stdout?.toString() || '';
      debug(`Upload error on attempt ${attempt}:`, rawErrorOutput);

      const prettyError = parseBwsErrorMessage(rawErrorOutput);

      if (isRateLimitError(prettyError)) {
        // Always use the 65 second delay for rate limits
        console.log(`\x1b[33mRate-limit detected; sleeping 65 seconds...\x1b[0m`);
        syncSleep(RATE_LIMIT_DELAYS.FIRST);
        timesRateLimited++;

        // Then continue (i.e. retry) if we haven't exceeded maxRetries
        if (attempt < maxRetries) {
          continue; // move on to next attempt
        }
      }

      // If it's not a rate-limit error (or we ran out of attempts), throw a real error
      throw new Error(`Failed to upload secret "${key}". BWS CLI said:\n${prettyError}`);
    }
  }
}

/**
 * Main function to process all .env.bws.* files in the directory
 */
const processEnvFiles = async (options = { clearFirst: false }) => {
  const files = fs.readdirSync(folderPath);
  const envFiles = files.filter((file) => file.startsWith('.env.bws.'));

  if (envFiles.length === 0) {
    console.error('No .env.bws.* files found in this folder.');
    process.exit(1);
  }

  const uploadResults = [];

  for (const file of envFiles) {
    const envFilePath = path.join(folderPath, file);
    const projectId = file.split('.').pop();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      showErrorAndExit(`
[ERROR] Invalid or inaccessible project ID: "${projectId}"

Please check:
1. Project ID format should be: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Current file: ${file}

2. Verify BWS_ACCESS_TOKEN permissions:
   • Token must have WRITE access to this project
   • Check permissions at: https://vault.bitwarden.com/#/sm/access-policies

3. Confirm project exists and is accessible:
   • Visit: https://vault.bitwarden.com/#/sm/projects
   • Ensure project ID matches exactly
   • Verify you have proper access to this project

4. File naming convention:
   • File should be named: .env.bws.<project-id>
   • Example: .env.bws.12345678-1234-1234-1234-123456789abc

Need help? Visit: https://bitwarden.com/help/secrets-manager-overview/
`);
    }

    try {
      // Clear existing secrets if option is enabled
      if (options.clearFirst) {
        await clearProjectSecrets(projectId);

        // Add pause after clearing secrets
        console.log('\x1b[33m'); // Yellow color
        console.log('=========================================================');
        console.log('Secrets have been cleared. Pausing for verification...');
        console.log('You can verify deletion by checking the Bitwarden vault.');
        console.log(getProjectSecretsUrl(projectId));
        console.log('');
        console.log('Will continue with upload in 10 seconds...');
        console.log('Press Ctrl+C to cancel if something looks wrong.');
        console.log('=========================================================');
        console.log('\x1b[0m'); // Reset color

        // Wait 10 seconds
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // Transform the file contents first
      const secrets = transformEnvFile(envFilePath);
      const secretList = Object.entries(secrets).map(([key, value]) => ({ key, value }));

      if (!secretList.length) {
        console.log(`No valid secrets found in ${file}. Skipping upload.`);
        uploadResults.push({ file, projectId, success: true, count: 0 });
        return;
      }

      console.log(
        `\nFound ${secretList.length} secrets in ${file}. Uploading to projectId: ${projectId}...`
      );

      // Then upload each secret
      secretList.forEach((secret, idx) => {
        const { key, value } = secret;
        const sanitizedValue = sanitizeValue(value);
        uploadSecretWithRetry(key, sanitizedValue, projectId);

        const current = idx + 1;
        console.log(`Uploaded secret "${key}" (${current}/${secretList.length})...`);
      });

      uploadResults.push({ file, projectId, success: true, count: secretList.length });

      // Add longer delay between files
      if (envFiles.length > 1 && envFiles.indexOf(file) < envFiles.length - 1) {
        console.log(
          `Upload complete for this file; waiting ${
            RATE_LIMIT_DELAYS.BETWEEN_FILES / 1000
          } seconds before the next file...`
        );
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAYS.BETWEEN_FILES));
      } else {
        console.log('Upload complete for this file; no further wait needed.');
      }
    } catch (error) {
      const prettyError = parseBwsErrorMessage(error.message);
      uploadResults.push({ file, projectId, success: false, error: prettyError });
    }
  }

  printFinalSummary(uploadResults);
};

/**
 * Prints a consolidated summary at the very end.
 * Shows a green success box listing any successful files,
 * and a red error box listing any failures.
 */
function printFinalSummary(uploadResults) {
  const successes = uploadResults.filter((r) => r.success);
  const failures = uploadResults.filter((r) => !r.success);

  if (successes.length > 0) {
    createSuccessBox(successes, uploadResults);
  }

  if (failures.length > 0) {
    let errorLines = [];
    errorLines.push('');
    errorLines.push(
      `ERROR! ${failures.length} of ${uploadResults.length} file(s) failed to upload.`
    );
    errorLines.push('');

    failures.forEach((f) => {
      errorLines.push(`File: ${f.file}`);
      errorLines.push(`Project ID: ${f.projectId}`);
      errorLines.push('Reason:');
      if (f.error.includes('Resource not found')) {
        errorLines.push('  Project ID not found or no access. Please check:');
        errorLines.push('  • BWS_ACCESS_TOKEN has WRITE access to this project');
        errorLines.push('  • Project ID exists and is accessible');
        errorLines.push('  • Visit: https://vault.bitwarden.com/#/sm/projects');
      } else {
        errorLines.push(...f.error.split('\n').map((l) => `  ${l}`));
      }
      errorLines.push('');
    });

    errorLines.push('Please fix the issues above and re-run the script.');

    // Calculate dynamic separator width based on the longest line
    const maxLineLength = Math.max(...errorLines.map((line) => line.length));
    const separator = '='.repeat(maxLineLength);

    // Insert the separator dynamically
    errorLines.unshift(separator);
    errorLines.push(separator);

    createErrorBox(errorLines);
  }

  if (successes.length === 0 && failures.length === 0) {
    console.log('No files were processed.');
  }
}

// Add a warning if BWS_ACCESS_TOKEN is found in any file
function checkForSensitiveVars(fileContent, fileName) {
  const lines = fileContent.split(/\r?\n/);
  const sensitiveVars = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const key = trimmed.split('=')[0].trim();
    if (EXCLUDED_VARS.includes(key)) {
      sensitiveVars.push(key);
    }
  });

  if (sensitiveVars.length > 0) {
    createBox(
      [
        '',
        '⚠️  WARNING: Sensitive variables found!',
        '',
        `Found in file: ${fileName}`,
        '',
        'The following variables will be skipped:',
        ...sensitiveVars.map((v) => `  - ${v}`),
        '',
        'These variables should not be uploaded to BWS.',
        ''
      ],
      '\x1b[33m'
    ); // Yellow warning box
  }
}

// For missing token
if (!process.env.BWS_ACCESS_TOKEN) {
  // prettier-ignore
  {
    console.error('\x1b[33m╔════════════════════════════════════════════════════════╗\x1b[0m');
    console.error('\x1b[33m║                                                        ║\x1b[0m');
    console.error('\x1b[33m║             WARNING: BWS TOKEN MISSING                 ║\x1b[0m');
    console.error('\x1b[33m║                                                        ║\x1b[0m');
    console.error('\x1b[33m║ To use BWS features:                                   ║\x1b[0m');
    console.error('\x1b[33m║ 1. Log in to vault.bitwarden.com                       ║\x1b[0m');
    console.error('\x1b[33m║ 2. Go to Secrets Manager > Machine Accounts            ║\x1b[0m');
    console.error('\x1b[33m║ 3. Create or copy your machine access token            ║\x1b[0m');
    console.error('\x1b[33m║ 4. Add to .env: BWS_ACCESS_TOKEN=your_token            ║\x1b[0m');
    console.error('\x1b[33m║                                                        ║\x1b[0m');
    console.error('\x1b[33m║ For now, continuing with only .env values...           ║\x1b[0m');
    console.error('\x1b[33m║                                                        ║\x1b[0m');
    console.error('\x1b[33m╚════════════════════════════════════════════════════════╝\x1b[0m');
    console.error(
      '\nVisit the link below to create your token: \n' +
        getMachineAccountsUrl()
    );
  }
  process.exit(1);
}

// Add this try/catch block for token validation
try {
  // NOSONAR: BWS CLI execution for token validation - no user input
  /* sonar-disable-next-line sonar:S4721 */
  execSync(`./node_modules/.bin/bws project list -t ${process.env.BWS_ACCESS_TOKEN}`, {
    stdio: 'ignore',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
  });
} catch (err) {
  // prettier-ignore
  {
    console.error('\x1b[31m╔════════════════════════════════════════════════════════╗\x1b[0m');
    console.error('\x1b[31m║                                                        ║\x1b[0m');
    console.error('\x1b[31m║             CRITICAL BWS TOKEN ERROR                   ║\x1b[0m');
    console.error('\x1b[31m║                                                        ║\x1b[0m');
    console.error('\x1b[31m║ Your BWS_ACCESS_TOKEN appears to be invalid:           ║\x1b[0m');
    console.error('\x1b[31m║ 1. Check if token has expired                          ║\x1b[0m');
    console.error('\x1b[31m║ 2. Verify token permissions in vault.bitwarden.com     ║\x1b[0m');
    console.error('\x1b[31m║ 3. Generate new token if needed                        ║\x1b[0m');
    console.error('\x1b[31m║ 4. Ensure token has read access to required projects   ║\x1b[0m');
    console.error('\x1b[31m║                                                        ║\x1b[0m');
    console.error('\x1b[31m║ For now, continuing with only .env values...           ║\x1b[0m');
    console.error('\x1b[31m║                                                        ║\x1b[0m');
    console.error('\x1b[31m╚════════════════════════════════════════════════════════╝\x1b[0m');
    console.error(
      '\nVisit the link below to check or regenerate your token: \n' +
        getMachineAccountsUrl()
    );
  }
  process.exit(1);
}

// Add near the top, before processing starts
function showInitialWarning() {
  // prettier-ignore
  {
    console.log('\x1b[33m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[33m║                                                                  ║\x1b[0m');
    console.log('\x1b[33m║                   IMPORTANT NOTE                                 ║\x1b[0m');
    console.log('\x1b[33m║                                                                  ║\x1b[0m');
    console.log('\x1b[33m║ When uploading secrets:                                          ║\x1b[0m');
    console.log('\x1b[33m║                                                                  ║\x1b[0m');
    console.log('\x1b[33m║ 1. Use --clear-vars to remove existing secrets first             ║\x1b[0m');
    console.log('\x1b[33m║    Example: pnpm secure-run --upload-secrets --clear-vars        ║\x1b[0m');
    console.log('\x1b[33m║                                                                  ║\x1b[0m');
    console.log('\x1b[33m║ 2. Or manually update values in Bitwarden if you                 ║\x1b[0m');
    console.log('\x1b[33m║    want to preserve other existing secrets                       ║\x1b[0m');
    console.log('\x1b[33m║                                                                  ║\x1b[0m');
    console.log('\x1b[33m║ Continuing in 5 seconds...                                       ║\x1b[0m');
    console.log('\x1b[33m║ Press Ctrl+C to cancel                                           ║\x1b[0m');
    console.log('\x1b[33m║                                                                  ║\x1b[0m');
    console.log('\x1b[33m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
  }

  // Give user time to read and potentially cancel
  syncSleep(5000);
}

// Change the check for clearvars to accept both formats
const shouldClearFirst =
  process.argv.includes('--clearvars') || process.argv.includes('--clear-vars');

// Add initial warning if not using clear-vars
if (!shouldClearFirst) {
  showInitialWarning();
}

// Start processing with options
processEnvFiles({ clearFirst: shouldClearFirst });
