#!/usr/bin/env node

/**
 * updateEnvVars.js
 *
 * Entry point for the environment variable update script. This file:
 * 1. Parses CLI arguments.
 * 2. Loads configuration from bwsconfig.json.
 * 3. Reads required environment variables from requiredVars.env.
 * 4. Delegates tasks to Netlify and Vercel modules for reading/updating variables.
 * 5. Logs and summarizes the results.
 *
 * Usage:
 *   node updateEnvVars.js --platform netlify
 *   node updateEnvVars.js --platform vercel
 *   node updateEnvVars.js --help
 *
 * @module main
 */

import fs from 'node:fs'; // Regular fs for sync operations
import { promises as fsPromises } from 'node:fs'; // For async operations
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {
  readVars as readNetlifyVariables,
  updateNetlifyEnvVars as updateNetlifyEnvironmentVariables
} from './netlify.js';
import {
  handleError,
  readEnvFile as readEnvironmentFile,
  validateValue,
  shouldPreserveVar as shouldPreserveVariable,
  getBuildOrAuthToken,
  validateDeployment,
  decryptContent
} from './utils.js';
import {
  readVars as readVercelVariables,
  updateVars as updateVercelVariables,
  updateVercelEnvVars as updateVercelEnvironmentVariables
} from './vercel.js';
import logger from '../logger.js';

dotenv.config();

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isRunningOnPlatform() {
  const isPlatform = process.env.VERCEL === '1' || process.env.NETLIFY === 'true';
  logger.debug(
    `Platform check: VERCEL=${process.env.VERCEL}, NETLIFY=${process.env.NETLIFY}, isPlatform=${isPlatform}`
  );
  return isPlatform;
}

/**
 * Reads the bwsconfig.json file (shared by both Netlify and Vercel operations)
 * @returns {Object} config object containing array of projects
 */
async function readConfigFile() {
  try {
    // bwsconfig.json is expected to be located one level up, e.g.: scripts/bws-secure/bwsconfig.json
    const configPath = path.join(__dirname, '../../../bwsconfig.json');
    const data = await fsPromises.readFile(configPath);
    return JSON.parse(data);
  } catch (error) {
    handleError(error, 'Failed to read configuration file');
  }
}

/**
 * Gathers environment variables by reading both local env files and
 * platform variables depending on project settings.
 *
 * @param {string[]} requiredVars - List of required variables from requiredVars.env
 * @param {Object[]} projects - Array of project configs (from bwsconfig.json)
 * @returns {Object} An object containing a mapping of found: {}, missing: [], excluded: []
 */
async function gatherAllVariables(requiredVariables, projects) {
  const found = {};
  const missing = [];
  const excluded = [];

  // Skip local environment variables when running on a platform
  const isPlatform = process.env.VERCEL === '1' || process.env.NETLIFY === 'true';

  for (const variableLine of requiredVariables) {
    const variableCandidate = variableLine.trim();
    if (!variableCandidate || variableCandidate.startsWith('#')) {
      continue;
    }

    // Only check local environment if not running on a platform
    if (!isPlatform && process.env[variableCandidate]) {
      logger.debug(`Found locally: ${variableCandidate} (local development only)`);
      found[variableCandidate] = process.env[variableCandidate];
    } else {
      missing.push(variableCandidate);
    }
  }

  // For each platform (netlify or vercel), read environment variables and see if we can fill in the missing pieces
  for (const project of projects) {
    const platform = project.platform.toLowerCase();
    let platformVariables = null;

    try {
      // Decide which readVars function to call
      if (platform === 'netlify') {
        platformVariables = await readNetlifyVariables(project);
      } else if (platform === 'vercel') {
        platformVariables = await readVercelVariables(project);
      } else {
        logger.warn(`Unknown platform: ${platform}`);
        continue;
      }

      // The readVars function returns an object like:
      // { found: { VAR1: '', VAR2: '' }, missing: [], excluded: [] }
      // We'll use it to fill in found vars if they are still missing
      if (platformVariables && platformVariables.found) {
        for (const [key, value] of Object.entries(platformVariables.found)) {
          // Only fill in if we previously didn't have a local value
          if (!found[key] && !excluded.includes(key)) {
            found[key] = value;
            // If key was in missing, remove it
            const mIndex = missing.indexOf(key);
            if (mIndex >= 0) {
              missing.splice(mIndex, 1);
            }
          }
        }
      }

      // Combine excluded variables for logging
      if (platformVariables && platformVariables.excluded) {
        for (const exVariable of platformVariables.excluded) {
          if (!excluded.includes(exVariable)) {
            excluded.push(exVariable);
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed reading environment for project (${project.platform}): ${error.message}`);
    }
  }

  return { found, missing, excluded };
}

/**
 * For each project in bwsconfig.json, attempts to update the remote platform with relevant environment variables.
 *
 * @param {Object[]} projects - Array of project configs
 * @param {Object} baseVars - Object of all environment variables that we have found so far
 */
async function updateProjects(projects, baseVariables) {
  for (const project of projects) {
    const platform = project.platform.toLowerCase();
    const variablesToUpdate = {};

    // netlify or vercel
    // Filter out excluded and preserved variables for that project
    for (const [variableName, value] of Object.entries(baseVariables)) {
      // Exclusion
      if (project.exclusions && project.exclusions.includes(variableName)) {
        logger.debug(
          `Excluding var ${variableName} for project ${project.siteSlug || project.projectName}`
        );
        continue;
      }

      // Preservation
      if (shouldPreserveVariable(variableName, project)) {
        logger.debug(
          `Preserving var ${variableName} for project ${project.siteSlug || project.projectName}`
        );
        continue;
      }

      // Validate value correctness
      const check = validateValue(variableName, value);
      if (!check.isValid) {
        logger.warn(
          `Skipping update for var ${variableName} due to invalid format (${check.error})`
        );
        continue;
      }

      // Passed all checks, queue for update
      variablesToUpdate[variableName] = check.value;
    }

    // If no vars to update, skip
    if (Object.keys(variablesToUpdate).length === 0) {
      logger.info(
        `No environment variables to update for project: ${project.siteSlug || project.projectName}`
      );
      continue;
    }

    // Update time
    try {
      let result = null;
      if (platform === 'netlify') {
        // Call updateNetlifyEnvVars directly
        await updateNetlifyEnvironmentVariables(project);
        result = { updated: variablesToUpdate };
      } else if (platform === 'vercel') {
        result = await updateVercelEnvironmentVariables(project);
      }

      // Log the result if returned
      if (result && result.updated) {
        logger.info(
          `Updated variables for project ${project.siteSlug || project.projectName}: ${Object.keys(
            result.updated
          ).join(', ')}`
        );
      }
    } catch (error) {
      logger.error(`Failed to update environment variables for project: ${error.message}`);
    }
  }
}

/**
 * Main function that orchestrates reading config, gathering variables, running validations,
 * and delegating read/update operations across platforms.
 */
async function main() {
  try {
    logger.debug('Checking if running on platform...');
    if (!isRunningOnPlatform()) {
      logger.debug('Not running on platform, exiting');
      process.exit(0);
    }

    // Load platform tokens ONCE at the start
    if (fs.existsSync('.env.secure')) {
      try {
        const content = fs.readFileSync('.env.secure', 'utf8');
        const key = process.env.BWS_PLATFORM_KEY || process.env.BWS_EPHEMERAL_KEY;
        logger.debug(`Attempting to decrypt platform tokens with key: ${key.slice(0, 8)}...`);

        const decrypted = decryptContent(content, key);
        const platformTokens = dotenv.parse(decrypted);

        // Set tokens in environment
        Object.assign(process.env, platformTokens);

        if (process.env.DEBUG === 'true') {
          logger.debug('Loaded platform tokens:');
          logger.debug(
            `NETLIFY_AUTH_TOKEN: ${process.env.NETLIFY_AUTH_TOKEN ? '✓ Present' : '❌ Missing'}`
          );
          logger.debug(
            `VERCEL_AUTH_TOKEN: ${process.env.VERCEL_AUTH_TOKEN ? '✓ Present' : '❌ Missing'}`
          );
        }
      } catch (error) {
        logger.warn(`Failed to load platform tokens: ${error.message}`);
      }
    }

    // Ensure newline before logger output to prevent merging with progress bar
    console.log('');
    logger.info('Starting platform variable sync...');
    const config = await readConfigFile();

    // Filter projects based on current platform
    const currentPlatform =
      process.env.NETLIFY === 'true' ? 'netlify' : process.env.VERCEL === '1' ? 'vercel' : null;

    // Check for SITE_NAME environment variable when on Netlify
    let currentProjectName = process.env.BWS_PROJECT;

    if (process.env.NETLIFY === 'true' && process.env.SITE_NAME) {
      // If SITE_NAME exists, use it instead and log the change
      logger.info(`Running on Netlify - detected SITE_NAME: ${process.env.SITE_NAME}`);
      if (currentProjectName) {
        logger.info(`BWS_PROJECT is set to: ${currentProjectName}`);
      }

      // Check if there's a project matching the SITE_NAME
      const siteNameMatch = config.projects.find(
        (project) =>
          project.platform.toLowerCase() === 'netlify' &&
          project.projectName === process.env.SITE_NAME
      );

      if (siteNameMatch) {
        logger.info(`Matched project using Netlify SITE_NAME: ${process.env.SITE_NAME}`);
        if (currentProjectName !== process.env.SITE_NAME) {
          logger.info(`Setting BWS_PROJECT=${process.env.SITE_NAME} to match Netlify SITE_NAME`);
          currentProjectName = process.env.SITE_NAME;
          // Update environment variable for downstream processes
          process.env.BWS_PROJECT = currentProjectName;
        }

        // Important: Process ONLY the project matching SITE_NAME
        logger.info(`Will update only project: ${currentProjectName}`);

        // Filter the projects array to include only the matching project
        config.projects = config.projects.filter(
          (project) =>
            project.platform.toLowerCase() === 'netlify' &&
            project.projectName === currentProjectName
        );

        if (config.projects.length === 1) {
          logger.info(
            `Processing project ${currentProjectName} - matched using SITE_NAME (${process.env.SITE_NAME})`
          );
        }
      }
    }

    const currentProject = config.projects.find(
      (project) =>
        project.platform.toLowerCase() === currentPlatform &&
        project.projectName === currentProjectName
    );

    if (!currentProject) {
      // Use logger instead of direct console.warn
      logger.warn(
        'No matching project found for ' +
          currentPlatform +
          '/' +
          currentProjectName +
          ' - Project exists in bwsconfig.json but is not configured for ' +
          currentPlatform +
          ' platform'
      );
      process.exit(0);
    }

    // Visual separator for clarity - use logger methods
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`Starting update for project: ${currentProject.projectName}`);
    logger.info(`${'='.repeat(80)}\n`);

    try {
      if (currentProject.platform === 'vercel' && process.env.VERCEL === '1') {
        await updateVercelEnvironmentVariables(currentProject);
      } else if (currentProject.platform === 'netlify' && process.env.NETLIFY === 'true') {
        await updateNetlifyEnvironmentVariables(currentProject);
      }
    } catch (platformError) {
      // Check for critical errors that should fail the build
      if (platformError.message.includes('Critical Error:')) {
        logger.error(`BUILD FAILURE: ${platformError.message}`);
        process.exit(1); // Critical errors should always fail the build
      }

      // Handle Vercel auth errors
      if (
        currentProject.platform === 'vercel' &&
        (platformError.message.includes('Not authorized') ||
          platformError.message.includes('forbidden'))
      ) {
        // Use logger for the warning messages
        logger.warn('╔════════════════════════════════════════════════════════╗');
        logger.warn('║                                                        ║');
        logger.warn('║           WARNING: VERCEL TOKEN INVALID                ║');
        logger.warn('║    Update VERCEL_AUTH_TOKEN in BWS for auto-sync       ║');
        logger.warn('║        Platform variables may be out of sync           ║');
        logger.warn('║                                                        ║');
        logger.warn('╚════════════════════════════════════════════════════════╝');
        // Handle Netlify auth errors
      } else if (
        currentProject.platform === 'netlify' &&
        (platformError.message.includes('unauthorized') || platformError.message.includes('403'))
      ) {
        // Use logger for the warning messages
        logger.warn('╔════════════════════════════════════════════════════════╗');
        logger.warn('║                                                        ║');
        logger.warn('║           WARNING: NETLIFY TOKEN INVALID               ║');
        logger.warn('║    Update NETLIFY_AUTH_TOKEN in BWS for auto-sync      ║');
        logger.warn('║        Platform variables may be out of sync           ║');
        logger.warn('║                                                        ║');
        logger.warn('╚════════════════════════════════════════════════════════╝');
      } else {
        logger.warn(`Platform sync skipped: ${platformError.message}`);
      }
    }
  } catch (error) {
    // Check for critical errors that should fail the build
    if (error.message.includes('Critical Error:')) {
      logger.error(`BUILD FAILURE: ${error.message}`);
      process.exit(1); // Critical errors should always fail the build
    }

    logger.warn(`Unable to sync platform variables: ${error.message}`);
  }
}

// Run the main function
main().catch((error) => {
  // Check for critical errors that should fail the build
  if (error.message.includes('Critical Error:')) {
    logger.error(`BUILD FAILURE: ${error.message}`);
    process.exit(1); // Critical errors should always fail the build
  }

  handleError(error, 'An unexpected error occurred in updateEnvVars.js');
});
