#!/usr/bin/env node

/* eslint-disable no-console */

import { spawnSync, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs, { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ensureBwsInstalled } from './bws-dotenv.js';
import {
  promptForProject,
  updateEnvironmentBwsSection,
  determineEnvironment,
  normalizeEnvironment,
  readConfigFile,
  log
} from './project-selector.js';
import { execBwsCommandWithRetrySync } from './bws-retry-utils.js';
// Import functions from project-selector module

// Get the directory name in ESM
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Helper function to properly parse multiline environment variables from BWS output
function parseEnvironmentOutput(output) {
  const result = {};
  const lines = output.split('\n');
  let currentKey = null;
  let currentValue = '';

  for (const line of lines) {
    // Check if this line starts a new variable (has = and doesn't start with whitespace)
    if (line.includes('=') && !line.startsWith(' ') && !line.startsWith('\t')) {
      // Save previous variable if exists
      if (currentKey !== null) {
        result[currentKey] = currentValue;
      }

      // Start new variable
      const equalIndex = line.indexOf('=');
      currentKey = line.substring(0, equalIndex).trim();
      currentValue = line.substring(equalIndex + 1);
    } else if (currentKey !== null && line.trim() !== '') {
      // This is a continuation line for the current variable
      currentValue += '\n' + line;
    }
  }

  // Don't forget the last variable
  if (currentKey !== null) {
    result[currentKey] = currentValue;
  }

  return result;
}

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

// Add wrapper function to handle environment variable fallback
async function readConfigFileWithFallback() {
  try {
    // First try the normal readConfigFile
    return await readConfigFile();
  } catch (error) {
    log('debug', `readConfigFile failed with error: ${error.message}`);

    // If it fails and the error is about missing bwsconfig.json, check for _bwsconfig_json in BWS secrets
    if (error.message.includes('bwsconfig.json not found')) {
      log('debug', 'bwsconfig.json not found, checking for _bwsconfig_json in BWS secrets');

      const hasToken = process.env.BWS_ACCESS_TOKEN;

      log('debug', `BWS_ACCESS_TOKEN exists: ${!!hasToken}`);

      if (hasToken) {
        try {
          log('debug', 'Fetching secrets from BWS to look for _bwsconfig_json...');
          // Get all secrets using BWS with retry logic
          const output = execBwsCommandWithRetrySync(
            `${getBwsCommand()} secret list -t ${process.env.BWS_ACCESS_TOKEN} --output json`,
            { encoding: 'utf8' },
            'Config secrets fetch'
          );

          // Clean output of any ANSI codes
          const cleanOutput = output.replace(/\u001B\[\d+m/g, '').trim();
          const secrets = JSON.parse(cleanOutput);

          // Look for all _bwsconfig_json secrets (could be _bwsconfig_json, _bwsconfig_json_1, etc.)
          const configSecrets = secrets.filter((secret) =>
            secret.key.startsWith('_bwsconfig_json')
          );

          if (configSecrets.length > 0) {
            log(
              'debug',
              `Found ${configSecrets.length} _bwsconfig_json secret(s), parsing and merging content...`
            );

            // Parse all configs and merge them
            const mergedConfig = { projects: [] };
            const projectMap = new Map(); // Use Map to track projects by platform+projectName

            for (const configSecret of configSecrets) {
              try {
                log('debug', `Processing secret: ${configSecret.key}`);
                const configContent = JSON.parse(configSecret.value);

                if (configContent.projects && Array.isArray(configContent.projects)) {
                  for (const project of configContent.projects) {
                    const projectKey = `${project.platform}:${project.projectName}`;

                    if (projectMap.has(projectKey)) {
                      // Merge bwsProjectIds with existing project
                      const existingProject = projectMap.get(projectKey);
                      existingProject.bwsProjectIds = {
                        ...existingProject.bwsProjectIds,
                        ...project.bwsProjectIds
                      };
                      log('debug', `Merged bwsProjectIds for project: ${project.projectName}`);
                    } else {
                      // Add new project
                      projectMap.set(projectKey, { ...project });
                      log('debug', `Added new project: ${project.projectName}`);
                    }
                  }
                }
              } catch (parseError) {
                log('error', `Failed to parse secret ${configSecret.key}: ${parseError.message}`);
              }
            }

            // Convert map back to array
            mergedConfig.projects = Array.from(projectMap.values());

            // Create the file locally
            const configPath = path.join(process.cwd(), 'bwsconfig.json');
            await fsPromises.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));

            const secretNames = configSecrets.map((s) => s.key).join(', ');
            log('info', `✓ Created bwsconfig.json from BWS secrets: ${secretNames}`);
            log(
              'info',
              `✓ Merged ${mergedConfig.projects.length} project(s) with combined environments`
            );

            return mergedConfig;
          } else {
            log('debug', '_bwsconfig_json secret not found in BWS');
          }
        } catch (bwsError) {
          log('error', `Failed to retrieve _bwsconfig_json from BWS: ${bwsError.message}`);
        }
      } else {
        log('debug', 'BWS_ACCESS_TOKEN not set');
      }
    }

    // Re-throw the original error if we can't handle it
    throw error;
  }
}

// Add flag to detect nested execution
const isNestedExecution = process.env.BWS_SECURE_RUN_ACTIVE === 'true';
// Set flag to prevent nested full executions
process.env.BWS_SECURE_RUN_ACTIVE = 'true';

// Check if this is a nested execution and log it
if (isNestedExecution) {
  log('info', 'Detected nested secure-run execution - using parent environment');
}

// 1) Explicitly load .env from the repo root (../../.env) in case we're running from a subdirectory
const dotenvPath = path.join(dirname, '../../.env');
dotenv.config({ path: dotenvPath });

// Platform detection
const isNetlify = process.env.NETLIFY === 'true';
const isVercel = process.env.VERCEL === '1';
const isDebug = process.env.DEBUG === 'true';

// Add this near the top of the file with other imports
const DEBUG = process.env.DEBUG === 'true';

// Add this function before setupEnvironment
async function ensureRequiredVariablesFile() {
  log('info', 'Scanning codebase for required environment variables...');

  const scanResult = spawnSync(
    'node',
    [path.join(dirname, 'check-vars', 'requiredRuntimeVars.js')],
    {
      stdio: 'inherit',
      env: process.env
    }
  );

  if (scanResult.status !== 0) {
    throw new Error('Failed to scan for required environment variables');
  }

  const requiredVariablesPath = path.join(dirname, 'requiredVars.env');
  if (!fs.existsSync(requiredVariablesPath)) {
    throw new Error('Required variables file was not generated');
  }

  log('info', 'Required variables file generated successfully');
}

// After loading dotenv but before setupEnvironment
async function createRequiredVariablesFile() {
  try {
    const environmentPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(environmentPath)) {
      log('warn', 'No .env file found to create requiredVars.env');
      return;
    }

    const environmentContent = fs.readFileSync(environmentPath, 'utf8');
    const variables = environmentContent
      .split('\n')
      .filter(
        (line) =>
          // Keep only non-empty lines that aren't comments and contain an equals sign
          line.trim() && !line.trim().startsWith('#') && line.includes('=')
      )
      .map((line) => line.split('=')[0].trim()); // Extract just the variable names

    // Create the requiredVars.env file in the correct location
    const requiredVariablesPath = path.join(dirname, 'requiredVars.env');
    const requiredVariablesContent = variables.join('\n');

    fs.writeFileSync(requiredVariablesPath, requiredVariablesContent);
    log('info', `Created requiredVars.env with ${variables.length} variables`);
  } catch (error) {
    log('error', `Failed to create requiredVars.env: ${error.message}`);
    throw error;
  }
}

// 1) Add this helper function *before* any place you call spawnSync or execSync with "bws"
function getBwsCommand() {
  const binDir = path.join(process.cwd(), 'node_modules', '.bin');
  const exePath = path.join(binDir, 'bws.exe');

  if (process.platform === 'win32' && fs.existsSync(exePath)) {
    return exePath; // Use bws.exe on Windows
  }

  // Otherwise fallback to the script name "bws" for non-Windows
  return path.join(binDir, 'bws');
}

// Add helper to validate BWS token
async function validateBwsToken() {
  if (!process.env.BWS_ACCESS_TOKEN) {
    // prettier-ignore
    {
      console.warn('\u001B[33m╔════════════════════════════════════════════════════════╗\u001B[0m');
      console.warn('\u001B[33m║                                                        ║\u001B[0m');
      console.warn('\u001B[33m║             WARNING: BWS TOKEN MISSING                 ║\u001B[0m');
      console.warn('\u001B[33m║                                                        ║\u001B[0m');
      console.warn('\u001B[33m║ To use BWS features:                                   ║\u001B[0m');
      console.warn('\u001B[33m║ 1. Log in to vault.bitwarden.com                       ║\u001B[0m');
      console.warn('\u001B[33m║ 2. Go to Secrets Manager > Machine Accounts            ║\u001B[0m');
      console.warn('\u001B[33m║ 3. Create or copy your machine access token            ║\u001B[0m');
      console.warn('\u001B[33m║ 4. Add to .env: BWS_ACCESS_TOKEN=your_token            ║\u001B[0m');
      console.warn('\u001B[33m║                                                        ║\u001B[0m');
      console.warn('\u001B[33m║ For now, continuing with only .env values...           ║\u001B[0m');
      console.warn('\u001B[33m║                                                        ║\u001B[0m');
      console.warn('\u001B[33m╚════════════════════════════════════════════════════════╝\u001B[0m');
      console.warn(
        '\nVisit the link below to create your token: \n' +
          getMachineAccountsUrl()
      );
    }
    return false;
  }

  try {
    // Use retry logic for BWS token validation
    execBwsCommandWithRetrySync(
      `${getBwsCommand()} project list -t ${process.env.BWS_ACCESS_TOKEN}`,
      { stdio: 'ignore' },
      'Token validation'
    );
    return true;
  } catch {
    // prettier-ignore
    {
      console.error('\u001B[31m╔════════════════════════════════════════════════════════╗\u001B[0m');
      console.error('\u001B[31m║                                                        ║\u001B[0m');
      console.error('\u001B[31m║             CRITICAL BWS TOKEN ERROR                   ║\u001B[0m');
      console.error('\u001B[31m║                                                        ║\u001B[0m');
      console.error('\u001B[31m║ Your BWS_ACCESS_TOKEN appears to be invalid:           ║\u001B[0m');
      console.error('\u001B[31m║ 1. Check if token has expired                          ║\u001B[0m');
      console.error('\u001B[31m║ 2. Verify token permissions in vault.bitwarden.com     ║\u001B[0m');
      console.error('\u001B[31m║ 3. Generate new token if needed                        ║\u001B[0m');
      console.error('\u001B[31m║ 4. Ensure token has read access to required projects   ║\u001B[0m');
      console.error('\u001B[31m║                                                        ║\u001B[0m');
      console.error('\u001B[31m║ For now, continuing with only .env values...           ║\u001B[0m');
      console.error('\u001B[31m║                                                        ║\u001B[0m');
      console.error('\u001B[31m╚════════════════════════════════════════════════════════╝\u001B[0m');
      console.error(
        '\nVisit the link below to check or regenerate your token: \n' +
          getMachineAccountsUrl()
      );
    }
    return false;
  }
}

// Add this helper function for environment status display
function printEnvironmentSummary() {
  const environment = process.env.BWS_ENV || 'local';
  const project = process.env.BWS_PROJECT || 'none';
  const testVariable = process.env.BWS_TEST_VAR || process.env.BWS_SECRET_TEST_VAR;

  // FAIL if testVariable is not set
  if (!testVariable) {
    console.error(
      '\u001B[31m╔══════════════════════════════════════════════════════════╗\u001B[0m'
    );
    console.error(
      '\u001B[31m║                                                          ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║             CRITICAL ERROR: TEST VARIABLE                ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║                                                          ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║      BWS_TEST_VAR or BWS_SECRET_TEST_VAR must be set     ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║                                                          ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║  ERROR: Missing test variable indicates a critical issue  ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║  - Secrets may have failed to load properly              ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║  - Environment configuration may be incorrect            ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║  - BWS connection or authentication may have failed      ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║  - Project configuration may be missing or invalid       ║\u001B[0m'
    );
    console.error(
      '\u001B[31m║                                                          ║\u001B[0m'
    );
    console.error(
      '\u001B[31m╚══════════════════════════════════════════════════════════╝\u001B[0m'
    );
    process.exit(1);
  }

  const projectId = process.env.BWS_PROJECT_ID || 'none';

  // Cyan color code
  const cyan = '\x1b[36m';
  const reset = '\x1b[0m';

  // Simplified ASCII-only approach with cyan coloring
  console.log('');
  console.log(`${cyan}${'='.repeat(85)}${reset}`);
  console.log(`${cyan}  CURRENT ENVIRONMENT SUMMARY${reset}`);
  console.log(`${cyan}${'='.repeat(85)}${reset}`);
  console.log('');
  console.log(`${cyan}  Project           : ${reset}${project}`);
  console.log(`${cyan}  BWS_ENV           : ${reset}${environment}`);
  console.log(`${cyan}  BWS Project ID    : ${reset}${projectId}`);
  console.log(`${cyan}  BWS_TEST_VAR      : ${reset}${testVariable}`);
  console.log('');
  console.log(`${cyan}${'='.repeat(85)}${reset}`);
  console.log('');
}

// At the start of execution, store ALL original environment variables
const originalEnvironment = { ...process.env };
let originalEnvironmentFileContent = ''; // Store original .env file content

// Keep original setupEnvironment but enhance with platform support
async function setupEnvironment(options = { isPlatformBuild: false }) {
  log('info', 'Creating project-specific secure files...');

  // Save original .env file content if it exists
  const environmentPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(environmentPath)) {
    originalEnvironmentFileContent = await fsPromises.readFile(environmentPath, 'utf8');
  }

  if (options.isPlatformBuild) {
    log('debug', 'Running platform-specific setup...');
  }

  // Initialize tracking of created files
  process.env.BWS_CREATED_FILES = '[]';

  // Track which project IDs have already been loaded to avoid redundant API calls
  const loadedProjectIds = new Set();

  // Generate ephemeral encryption key if not exists
  if (!process.env.BWS_EPHEMERAL_KEY) {
    process.env.BWS_EPHEMERAL_KEY = crypto.randomBytes(32).toString('hex');
  }

  try {
    const config = await readConfigFileWithFallback();
    if (!config || !config.projects) {
      throw new Error('Invalid configuration file');
    }

    // Determine environment early
    const environment = determineEnvironment();
    process.env.BWS_ENV = environment;
    log('debug', `Using environment: ${environment}`);

    // Check for SITE_NAME early and filter projects if it exists (BEFORE downloading any secrets)
    let projectsToUse = [...config.projects];

    if (process.env.SITE_NAME) {
      log('info', `Detected SITE_NAME=${process.env.SITE_NAME}`);

      // Find the project matching SITE_NAME
      const siteNameMatch = config.projects.find(
        (project) => project.projectName === process.env.SITE_NAME
      );

      if (siteNameMatch) {
        log('info', `Found matching project for SITE_NAME: ${process.env.SITE_NAME}`);
        // Only use this project
        projectsToUse = [siteNameMatch];

        // Force BWS_PROJECT to match SITE_NAME for all operations
        process.env.BWS_PROJECT = process.env.SITE_NAME;
        log('info', `Forced BWS_PROJECT=${process.env.SITE_NAME} to match SITE_NAME`);
      } else {
        // CRITICAL CHANGE: Fail immediately if SITE_NAME doesn't match any project
        log(
          'error',
          `Critical Error: No project found matching SITE_NAME: ${process.env.SITE_NAME}`
        );
        process.exit(1);
      }
    } else if (process.env.BWS_PROJECT) {
      // When SITE_NAME is not available but BWS_PROJECT is set, use it to filter projects
      log('info', `No SITE_NAME found, using BWS_PROJECT=${process.env.BWS_PROJECT}`);

      const projectMatch = config.projects.find(
        (project) => project.projectName === process.env.BWS_PROJECT
      );

      if (projectMatch) {
        log('info', `Found matching project for BWS_PROJECT: ${process.env.BWS_PROJECT}`);
        // Only use this project for the rest of the process
        projectsToUse = [projectMatch];
      } else {
        // CRITICAL CHANGE: Fail immediately if BWS_PROJECT doesn't match any project
        log(
          'error',
          `Critical Error: No project found matching BWS_PROJECT: ${process.env.BWS_PROJECT}`
        );
        process.exit(1);
      }
    } else if (isNetlify || isVercel) {
      // CRITICAL CHANGE: Fail build immediately if neither SITE_NAME nor BWS_PROJECT is set
      log(
        'error',
        `Critical Error: Neither SITE_NAME nor BWS_PROJECT environment variable is set. For platform builds, one of these must be specified.`
      );
      process.exit(1);
    }

    // Call promptForProject which will:
    // 1. Check process.env.BWS_PROJECT first
    // 2. If not set, check for project in .env file
    // 3. If still not found, prompt user to select a project (if multiple)
    // 4. Update .env file with selected project
    const selectedProject = await promptForProject(projectsToUse);
    process.env.BWS_PROJECT = selectedProject.projectName;

    // When neither SITE_NAME nor BWS_PROJECT was initially set, we need to filter projects now
    // that we have a selection from promptForProject
    if (projectsToUse.length > 1) {
      log(
        'info',
        `Multiple projects were available, filtering to only use selected project: ${process.env.BWS_PROJECT}`
      );
      projectsToUse = [selectedProject];
    }

    // Ensure we know which project IDs we need to load for the selected project
    const projectIdsToLoad = new Set();
    const selectedProjectConfig = config.projects.find(
      (p) => p.projectName === process.env.BWS_PROJECT
    );
    if (selectedProjectConfig && selectedProjectConfig.bwsProjectIds) {
      Object.values(selectedProjectConfig.bwsProjectIds).forEach((id) => {
        if (id) projectIdsToLoad.add(id);
      });
      log('debug', `Will load secrets for project IDs: ${[...projectIdsToLoad].join(', ')}`);
    }

    // Get unique platforms from config
    const platforms = new Set(projectsToUse.map((p) => p.platform.toLowerCase()));

    // Create global .env.secure with platform tokens
    if (process.env.BWS_ACCESS_TOKEN) {
      try {
        const result = spawnSync(
          getBwsCommand(),
          ['secret', 'list', '-t', process.env.BWS_ACCESS_TOKEN],
          {
            encoding: 'utf8',
            env: {
              ...process.env,
              NO_COLOR: '1',
              FORCE_COLOR: '0',
              TERM: 'dumb' // Add this to further discourage color output
            }
          }
        );

        if (result.status === 0) {
          // Always clean the output, even without DEBUG
          const cleanOutput = result.stdout.replaceAll(/\u001B\[\d+m/g, '').trim();

          try {
            const secrets = JSON.parse(cleanOutput);
            const platformTokens = {};
            const platformsFound = [];

            // Only load tokens for the platform we're on
            if (isNetlify && platforms.has('netlify')) {
              const netlifyToken = secrets.find((s) => s.key === 'NETLIFY_AUTH_TOKEN');
              if (netlifyToken) {
                platformTokens.NETLIFY_AUTH_TOKEN = netlifyToken.value;
                platformsFound.push('Netlify');
              }
            }
            if (isVercel && platforms.has('vercel')) {
              const vercelToken = secrets.find((s) => s.key === 'VERCEL_AUTH_TOKEN');
              if (vercelToken) {
                platformTokens.VERCEL_AUTH_TOKEN = vercelToken.value;
                platformsFound.push('Vercel');
              }
            }

            // Only create .env.secure if we found tokens for our platform
            if (Object.keys(platformTokens).length > 0) {
              const content = Object.entries(platformTokens)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
              const cipherText = encryptContent(content, process.env.BWS_EPHEMERAL_KEY);
              fs.writeFileSync('.env.secure', cipherText);
              log('info', `✓ Successfully loaded auth tokens for: ${platformsFound.join(', ')}`);
            }
          } catch (error) {
            log('warn', `Failed to parse secrets: ${error.message}`);
          }
        }
      } catch (error) {
        log('warn', `Failed to create global .env.secure: ${error.message}`);
      }
    }

    // For platform builds, process each project
    if (isNetlify || isVercel) {
      // Save original environment values if they exist
      const originalEnvironment_ = {
        BWS_ENV: process.env.BWS_ENV,
        BWS_PROJECT: process.env.BWS_PROJECT,
        BWS_PROJECT_ID: process.env.BWS_PROJECT_ID,
        BWS_ACCESS_TOKEN: process.env.BWS_ACCESS_TOKEN
      };

      // Re-use filtered projects from above - no need to filter again
      let projectsToProcess = projectsToUse;

      for (const project of projectsToProcess) {
        log('info', `\n=== Processing ${project.projectName} ===`);

        // Create the standard environment files for this project
        const environmentMappings = {
          prod: project.bwsProjectIds.prod,
          dev: project.bwsProjectIds.dev,
          local: project.bwsProjectIds.local
        };

        // Track if any secrets were successfully loaded
        let secretsLoaded = false;

        // Only load and create environment files that don't already exist
        for (const [environment_, projectId] of Object.entries(environmentMappings)) {
          // Skip null/undefined project IDs
          if (!projectId) continue;

          // Only load this project ID if we haven't already
          if (!loadedProjectIds.has(projectId)) {
            const success = await loadEnvironmentSecrets(projectId, projectId);
            if (success) {
              secretsLoaded = true;
              loadedProjectIds.add(projectId);
            }
          } else {
            // If we already loaded this ID, consider it a success
            secretsLoaded = true;
          }

          // Create symlink or copy the file as needed
          const sourceFile = `.env.secure.${projectId}`;
          const targetFile = `.env.secure.${environment_}`;
          if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, targetFile);
            log('debug', `Created ${targetFile} from ${sourceFile}`);
          }
        }

        // CRITICAL: If no secrets were loaded for this project, fail immediately
        if (!secretsLoaded) {
          log(
            'error',
            `Critical Error: No secrets could be loaded for project ${project.projectName}`
          );
          log('error', `BWS project IDs may be invalid or inaccessible`);
          log('error', `Configuration shows: ${JSON.stringify(project.bwsProjectIds)}`);
          process.exit(1);
        }

        // Set current project in environment
        process.env.BWS_PROJECT = project.projectName;

        // Enhanced platform operations
        log('info', `Syncing platform variables for ${project.projectName}...`);
        const updateResult = spawnSync(
          'node',
          [path.join(dirname, 'update-environments', 'updateEnvVars.js')],
          {
            stdio: 'inherit',
            env: process.env
          }
        );

        // Clean up the standard environment files after processing this project
        if (!process.env.DEBUG) {
          for (const environment_ of ['prod', 'dev', 'local']) {
            const file = `.env.secure.${environment_}`;
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
              log('debug', `Cleaned up ${file}`);
            }
          }
        }
      }

      // After all platform operations, restore original values if they existed
      if (
        originalEnvironment_.BWS_ENV ||
        originalEnvironment_.BWS_PROJECT ||
        originalEnvironment_.BWS_PROJECT_ID ||
        originalEnvironment_.BWS_ACCESS_TOKEN
      ) {
        if (originalEnvironment_.BWS_ENV) {
          process.env.BWS_ENV = originalEnvironment_.BWS_ENV;
        }
        if (originalEnvironment_.BWS_PROJECT) {
          process.env.BWS_PROJECT = originalEnvironment_.BWS_PROJECT;
        }
        if (originalEnvironment_.BWS_PROJECT_ID) {
          process.env.BWS_PROJECT_ID = originalEnvironment_.BWS_PROJECT_ID;
        }
        if (originalEnvironment_.BWS_ACCESS_TOKEN) {
          process.env.BWS_ACCESS_TOKEN = originalEnvironment_.BWS_ACCESS_TOKEN;
        }

        // Load the environment based on restored values
        if (originalEnvironment_.BWS_PROJECT && originalEnvironment_.BWS_ENV) {
          const project = config.projects.find(
            (p) => p.projectName === originalEnvironment_.BWS_PROJECT
          );
          if (project) {
            const projectId = project.bwsProjectIds[originalEnvironment_.BWS_ENV];
            if (projectId) {
              process.env.BWS_PROJECT_ID = projectId;
              const sourceFile = `.env.secure.${projectId}`;
              if (fs.existsSync(sourceFile)) {
                const content = fs.readFileSync(sourceFile, 'utf8');
                const decrypted = decryptContent(content, process.env.BWS_EPHEMERAL_KEY);
                Object.assign(process.env, dotenv.parse(decrypted));
                log(
                  'info',
                  `Restored environment from ${sourceFile} for ${originalEnvironment_.BWS_ENV} environment`
                );
              }
            }
          }
        }
      }

      // Print final environment state
      printEnvironmentSummary();
    } else {
      // For local development, handle single project
      // First validate BWS token before prompting
      const isValidToken = await validateBwsToken();

      if (!isValidToken) {
        log('info', 'No valid BWS_ACCESS_TOKEN found, continuing with .env values only');
        return;
      }

      // BWS_PROJECT should already be set by now, but check again just to be safe
      if (!process.env.BWS_PROJECT) {
        log('warn', 'BWS_PROJECT not set - this should not happen, prompting for selection');
        await promptForProject(config.projects);
      }

      const projectName = process.env.BWS_PROJECT;
      const project = config.projects.find((p) => p.projectName === projectName);
      if (!project) {
        throw new Error(`Project ${projectName} not found in config`);
      }

      // For local development, prioritize loading the current environment first
      const environment = process.env.BWS_ENV || 'local';
      const currentProjectId = project.bwsProjectIds[environment];

      if (currentProjectId) {
        log(
          'info',
          `Loading secrets for current environment: ${environment} (project ID: ${currentProjectId})`
        );
        if (!loadedProjectIds.has(currentProjectId)) {
          await loadEnvironmentSecrets(currentProjectId, currentProjectId);
          loadedProjectIds.add(currentProjectId);
        }

        // Set the project ID in process.env
        process.env.BWS_PROJECT_ID = currentProjectId;

        // Load the active environment variables into process.env
        const sourceFile = `.env.secure.${currentProjectId}`;
        if (fs.existsSync(sourceFile)) {
          const content = fs.readFileSync(sourceFile, 'utf8');
          const decrypted = decryptContent(content, process.env.BWS_EPHEMERAL_KEY);

          // Parse decrypted content but don't override existing env vars
          const decryptedVariables = parseEnvironmentOutput(decrypted);
          for (const key of Object.keys(decryptedVariables)) {
            // Only set if not already defined in process.env
            if (!(key in process.env)) {
              process.env[key] = decryptedVariables[key];
            }
          }

          log('info', `Loaded environment from ${sourceFile} for local development`);
        }
      } else {
        log('warn', `No project ID found for environment ${environment}`);
      }

      // Then load any other project IDs that might be needed
      for (const [env, projectId] of Object.entries(project.bwsProjectIds)) {
        if (env !== environment && projectId && !loadedProjectIds.has(projectId)) {
          log(
            'debug',
            `Loading additional secrets for ${projectName} (${env}) project ID: ${projectId}`
          );
          await loadEnvironmentSecrets(projectId, projectId);
          loadedProjectIds.add(projectId);
        }
      }

      // Add environment summary
      printEnvironmentSummary();
    }

    // After all BWS and platform operations, restore original environment variables
    for (const [key, value] of Object.entries(originalEnvironment)) {
      process.env[key] = value;
    }

    // If we stored an original BWS_ENV value in debug mode, use it for the file restore
    if (process.env.ORIGINAL_BWS_ENV) {
      log('debug', `Restoring original BWS_ENV value: ${process.env.ORIGINAL_BWS_ENV}`);
      // Find the project
      const config = await readConfigFileWithFallback();
      const project = config.projects.find((p) => p.projectName === process.env.BWS_PROJECT);
      if (project) {
        // Update the .env file with the original environment
        await updateEnvironmentBwsSection(project, process.env.ORIGINAL_BWS_ENV);
      }
    }

    // Restore original .env file content
    await restoreOriginalEnvironmentFile();
  } catch (error) {
    log('error', `Failed to setup environment: ${error.message}`);
  }
}

// 4) If you also want to demonstrate decrypting from .env.secure, do it now in memory:
function decryptContent(encrypted, encryptionKey) {
  const [nonceBase64, authTagBase64, data] = encrypted.split(':');
  const nonce = Buffer.from(nonceBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), nonce);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Make the .env.secure verification optional
if (fs.existsSync('.env.secure') && process.env.BWS_ACCESS_TOKEN && process.env.BWS_EPHEMERAL_KEY) {
  try {
    const encryptedText = fs.readFileSync('.env.secure', 'utf8');
    const checkPlain = decryptContent(encryptedText, process.env.BWS_EPHEMERAL_KEY);
    console.log('Verified .env.secure decryption in memory...');
  } catch (error) {
    console.warn(`[WARN] Decryption from .env.secure failed. Skipping this step: ${error.message}`);
  }
}

// Add this function near the other crypto functions
function encryptContent(content, encryptionKey) {
  const nonce = crypto.randomBytes(12); // 12 bytes is optimal for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), nonce);
  let encrypted = cipher.update(content, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${nonce.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

// New function to handle environment-specific secrets
async function loadEnvironmentSecrets(environment, projectId) {
  if (!projectId || !environment) {
    log('error', 'Critical Error: Missing projectId or environment name');
    return false;
  }

  if (!process.env.BWS_ACCESS_TOKEN) {
    log('error', 'Critical Error: BWS_ACCESS_TOKEN not set');
    return false;
  }

  try {
    // More concise logging
    log('debug', `Loading secrets for ${projectId}...`);

    // Use retry logic for BWS secret list command
    const output = execBwsCommandWithRetrySync(
      `${getBwsCommand()} secret list -t ${
        process.env.BWS_ACCESS_TOKEN
      } ${projectId} --output json`,
      { encoding: 'utf-8' },
      `Loading secrets for ${projectId}`
    );

    let bwsSecrets;
    try {
      bwsSecrets = JSON.parse(output || '[]');
      // Validate that we actually got secrets back
      if (!Array.isArray(bwsSecrets) || bwsSecrets.length === 0) {
        log(
          'error',
          `Critical Error: No secrets found for projectId ${projectId} (${environment})`
        );
        return false;
      }
    } catch (parseError) {
      log(
        'error',
        `Critical Error: Invalid secrets data for ${environment}: ${parseError.message}`
      );
      return false;
    }

    // Create the secure file
    const environmentContent = bwsSecrets.map(({ key, value }) => `${key}=${value}`).join('\n');
    if (process.env.BWS_EPHEMERAL_KEY && environmentContent) {
      const cipherText = encryptContent(environmentContent, process.env.BWS_EPHEMERAL_KEY);
      fs.writeFileSync(`.env.secure.${projectId}`, cipherText, {
        encoding: 'utf-8'
      });

      // Only show detailed counts in debug mode
      if (process.env.DEBUG === 'true') {
        log('debug', `Created .env.secure.${projectId} with ${bwsSecrets.length} secrets`);
      }
      return true;
    }
    log(
      'error',
      `Critical Error: Failed to create secure file for ${projectId} - missing encryption key or empty content`
    );
    return false;
  } catch (error) {
    if (error?.message?.includes('404 Not Found')) {
      log(
        'error',
        `Critical Error: Project ${projectId} (${environment}): no secrets found or no access`
      );
      return false;
    }

    log('error', `Critical Error: Failed to load secrets for ${environment}: ${error.message}`);
    if (process.env.DEBUG === 'true') {
      if (error?.stdout) {
        log('debug', 'stdout:', error.stdout.toString());
      }
      if (error?.stderr) {
        log('debug', 'stderr:', error.stderr.toString());
      }
      log('debug', 'Error:', error?.message || 'Unknown error');
    }
    return false;
  }
}

// Add this helper function to handle loading the secure env file
function loadSecureEnvironment(environment) {
  const secureFile = `.env.secure.${environment}`;
  if (fs.existsSync(secureFile)) {
    console.log(`Loading ${environment} environment secrets...`);
    const encryptedText = fs.readFileSync(secureFile, 'utf8');
    const decrypted = decryptContent(encryptedText, process.env.BWS_EPHEMERAL_KEY);

    // Load decrypted vars into process.env
    const parsedVariables = parseEnvironmentOutput(decrypted);
    for (const [key, value] of Object.entries(parsedVariables)) {
      if (key && value !== undefined) {
        process.env[key.trim()] = value;
      }
    }
    console.log(`${environment} environment secrets loaded into process.env`);
  } else {
    console.warn(
      `\u001B[33mWarning: No ${environment} environment secrets found (${secureFile})\u001B[0m`
    );
  }
}

// Move cleanup function to top level
function cleanupSecureFiles() {
  try {
    // Clean up all .env.secure.* files and .env.secure
    const files = fs.readdirSync(process.cwd());
    for (const file of files) {
      if (file === '.env.secure' || file.startsWith('.env.secure.')) {
        fs.unlinkSync(path.join(process.cwd(), file));
        log('debug', `Cleaned up ${file}`);
      }
    }
  } catch (error) {
    log('warn', `Error during cleanup: ${error.message}`);
  }
}

// Add function to restore original .env file content
async function restoreOriginalEnvironmentFile() {
  try {
    // Only restore the BWS_ENV value if it was temporarily changed
    if (process.env.ORIGINAL_BWS_ENV && process.env.BWS_ENV !== process.env.ORIGINAL_BWS_ENV) {
      const environmentPath = path.join(process.cwd(), '.env');

      if (fs.existsSync(environmentPath)) {
        const content = await fsPromises.readFile(environmentPath, 'utf8');
        const lines = content.split('\n');

        // Find and update the BWS_ENV line
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          if (line.trim().startsWith('BWS_ENV=') && !line.startsWith('#')) {
            // Get comment if any
            const parts = line.split('#');
            const comment = parts.length > 1 ? `# ${parts.slice(1).join('#').trim()}` : '';

            // Replace with original value
            lines[index] = `BWS_ENV=${process.env.ORIGINAL_BWS_ENV}     ${comment}`;
            break;
          }
        }

        // Write back the file with just the BWS_ENV updated
        await fsPromises.writeFile(environmentPath, lines.join('\n'));
        log('debug', `Restored original BWS_ENV value: ${process.env.ORIGINAL_BWS_ENV}`);
      }
    } else {
      log('debug', 'No environment variables need to be restored');
    }
  } catch (error) {
    log('debug', `Error handling environment variables: ${error.message}`);
  }
}

// Update handleUploadCommand function to check for both formats
async function handleUploadCommand() {
  // Check if either --clearvars or --clear-vars was passed
  const clearVariables =
    process.argv.includes('--clearvars') || process.argv.includes('--clear-vars');

  // Run the upload-secrets script with clearvars if specified
  const uploadScript = path.join(dirname, 'upload-to-bws', 'upload-secrets.js');
  const arguments_ = clearVariables ? ['--clearvars'] : [];

  const result = spawnSync('node', [uploadScript, ...arguments_], {
    stdio: 'inherit',
    env: process.env
  });

  // Exit with the same status as the upload script
  process.exit(result.status);
}

// Main execution
(async () => {
  try {
    // Ensure BWS is installed before doing anything else
    ensureBwsInstalled();

    // Parse command line arguments
    const arguments_ = process.argv.slice(2);

    // Enhanced detection for upload-secrets command that works across package managers
    if (arguments_[0] === '--upload-secrets') {
      await handleUploadCommand();
      return;
    }

    // 1. Always load base .env first (but don't override original env vars)
    dotenv.config({ override: false });
    log('debug', 'Loaded base environment from .env');

    // Only perform BWS setup if this is not a nested execution
    if (!isNestedExecution) {
      // 2. Check if we need to scan for required vars
      const requiredVariablesPath = path.join(dirname, 'requiredVars.env');

      // Check for special debug flags
      const isNetlify = process.env.NETLIFY === 'true';
      const isVercel = process.env.VERCEL === '1';
      const isDebug = process.env.DEBUG === 'true';

      // In debug mode with platform flags, preserve original BWS_ENV if set
      if (isDebug && (isNetlify || isVercel) && !process.env.PRESERVE_ENV) {
        // Store original value if it exists
        if (process.env.BWS_ENV) {
          process.env.ORIGINAL_BWS_ENV = process.env.BWS_ENV;
        } else if (fs.existsSync('.env')) {
          // Try to read from .env file if exists
          const environmentContent = fs.readFileSync('.env', 'utf8');
          const match = environmentContent.match(/^\s*BWS_ENV\s*=\s*(\w+)/m);
          if (match && match[1]) {
            process.env.ORIGINAL_BWS_ENV = match[1];
          }
        }
      }

      // Only run environment scan for platform builds or debug mode
      if (!fs.existsSync(requiredVariablesPath) || isNetlify || isVercel || isDebug) {
        log('info', 'Scanning for required variables...');
        const scanResult = spawnSync(
          'node',
          [path.join(dirname, 'check-vars', 'requiredRuntimeVars.js')],
          {
            stdio: 'inherit'
          }
        );
        if (scanResult.status !== 0) {
          throw new Error('Failed to scan for required variables');
        }
      }

      // 3. Try BWS enhancement if possible
      try {
        const isValidToken = await validateBwsToken();

        // CRITICAL CHANGE: For platform builds, immediately exit if SITE_NAME or BWS_PROJECT not found
        if (isValidToken && (isNetlify || isVercel)) {
          if (!process.env.SITE_NAME && !process.env.BWS_PROJECT) {
            log(
              'error',
              'Critical Error: Neither SITE_NAME nor BWS_PROJECT environment variable is set. For platform builds, one of these must be specified.'
            );
            process.exit(1); // Immediately exit with error code
          }
        }

        if (isValidToken) {
          // Single setupEnvironment call that handles both cases
          try {
            await setupEnvironment({
              isPlatformBuild: isNetlify || isVercel
            });
          } catch (setupError) {
            // CRITICAL CHANGE: Exit immediately for any setupEnvironment errors
            log('error', `Failed to setup environment: ${setupError.message}`);
            process.exit(1);
          }

          // Call map-env-files.js to show decrypted contents if requested
          const mapResult = spawnSync(
            'node',
            [path.join(dirname, 'update-environments', 'map-env-files.js')],
            {
              stdio: 'inherit',
              env: process.env
            }
          );

          // Restore original variables after mapping
          for (const [key, value] of Object.entries(originalEnvironment)) {
            process.env[key] = value;
          }
        } else {
          log('info', 'No valid BWS_ACCESS_TOKEN found, continuing with .env values only');
        }
      } catch (error) {
        // CRITICAL CHANGE: Exit for any error in the BWS enhancement process
        log('error', `BWS enhancement failed: ${error.message}`);
        process.exit(1);
      }

      // 4. Run environment validation regardless
      log('info', 'Running environment validation...');
      const validator = spawnSync('node', [path.join(dirname, 'env_validator.js')], {
        stdio: 'inherit',
        env: process.env
      });

      // 5. IMPORTANT: Restore original environment variables to ensure CLI-provided vars take precedence
      for (const [key, value] of Object.entries(originalEnvironment)) {
        process.env[key] = value;
      }

      // Restore original .env file content
      await restoreOriginalEnvironmentFile();
    } else {
      // For nested executions, just inherit the parent process environment
      log('debug', 'Skipping BWS setup in nested execution');
    }

    // 6. Execute the command
    const command = process.argv.slice(2);
    if (command.length === 0) {
      log('warn', 'No command provided to execute');
      process.exit(0);
    }

    const result = spawnSync(arguments_.join(' '), [], {
      stdio: 'inherit',
      env: process.env,
      shell: true
    });

    process.exit(result.status);
  } catch (error) {
    log('error', error.message);
    process.exit(1);
  }
})();

// Comment out cleanup registrations
process.on('exit', () => {
  // Only clean up if this is the root execution
  if (!isNestedExecution) {
    cleanupSecureFiles();
    // We don't want to restore the original .env file as it would remove the project selection
    // Instead, the BWS_ENV is handled by restoreOriginalEnvironmentFile() which preserves project options
    if (originalEnvironmentFileContent) {
      log('debug', 'Skipping complete .env restoration to preserve BWS project selection');
    }
  }
});

process.on('SIGINT', async () => {
  // Only clean up if this is the root execution
  if (!isNestedExecution) {
    cleanupSecureFiles();
    // We don't want to restore the entire original .env file
    // The restoreOriginalEnvironmentFile function will only restore the BWS_ENV value if needed
    await restoreOriginalEnvironmentFile();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  // Only clean up if this is the root execution
  if (!isNestedExecution) {
    cleanupSecureFiles();
    // We don't want to restore the entire original .env file
    // The restoreOriginalEnvironmentFile function will only restore the BWS_ENV value if needed
    await restoreOriginalEnvironmentFile();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  // Only clean up if this is the root execution
  if (!isNestedExecution) {
    cleanupSecureFiles();
    // We don't want to restore the entire original .env file
    // The restoreOriginalEnvironmentFile function will only restore the BWS_ENV value if needed
    await restoreOriginalEnvironmentFile();
  }
  process.exit(1);
});
