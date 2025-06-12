/**
 * vercel.js
 *
 * This module contains all Vercel-specific operations for reading and updating
 * environment variables. It provides the following functions:
 *
 *   readVars(project, token) -> { found: {}, missing: [], excluded: [] }
 *   updateVars(project, token, vars) -> { updated: {} }
 *
 * The code interacts with Vercel via the CLI commands "vercel env ls --json" and
 * "vercel env add".
 */

import util from 'node:util';
import { exec } from 'node:child_process';
const execPromise = util.promisify(exec);
import {
  log,
  handleError,
  determineEnvironmentMapping,
  loadEnvironmentVariables,
  validateDeployment,
  shouldPreserveVar
} from './utils.js';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for Vercel environment variables
const vercelEnvCache = new Map();

/**
 * Generate a random timeout between 1-15 seconds to avoid API collisions
 * when multiple builds might be running concurrently with the same token
 */
function getRandomTimeout() {
  const minSeconds = 1;
  const maxSeconds = 15;
  const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds);
  const timeout = randomSeconds * 1000;
  log('debug', `Using random timeout of ${randomSeconds} seconds`);
  return timeout;
}

/**
 * Helper function to retrieve a properly formatted Vercel token
 */
function getVercelToken(token) {
  // First try token parameter
  if (token) {
    log('debug', 'Using provided token parameter');
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  // Then try VERCEL_AUTH_TOKEN (new)
  const authToken = process.env.VERCEL_AUTH_TOKEN;
  if (authToken) {
    log('debug', 'Using VERCEL_AUTH_TOKEN from environment');
    return authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  // Finally try VERCEL_TOKEN (legacy)
  const envToken = process.env.VERCEL_TOKEN;
  if (!envToken) {
    throw new Error(
      'No Vercel token found. Set VERCEL_AUTH_TOKEN env variable or provide token parameter.'
    );
  }

  log('debug', 'Using VERCEL_TOKEN from environment');
  return envToken.startsWith('Bearer ') ? envToken : `Bearer ${envToken}`;
}

/**
 * Attempts to read project details from .vercel/project.json
 * @returns {Promise<{projectId: string, orgId: string, projectName: string} | null>}
 */
async function getVercelProjectConfig() {
  try {
    const projectJsonPath = path.join(process.cwd(), '.vercel', 'project.json');
    const configStr = await fs.promises.readFile(projectJsonPath, 'utf8');
    const config = JSON.parse(configStr);

    log('debug', `Found Vercel project config: ${JSON.stringify(config)}`);
    return {
      projectId: config.projectId,
      orgId: config.orgId, // This is the team ID
      projectName: config.name || null
    };
  } catch (error) {
    log('debug', 'No .vercel/project.json found, will try to fetch project details from API');
    return null;
  }
}

/**
 * Helper to fetch the project from Vercel by project name.
 */
async function getProjectIdFromName(project, token) {
  const vercelToken = getVercelToken(token);

  try {
    // Get all teams the user has access to
    let teams = [];
    try {
      const teamsResp = await axios.get('https://api.vercel.com/v2/teams', {
        headers: { Authorization: vercelToken }
      });
      teams = teamsResp.data.teams || [];
      log('debug', `Found ${teams.length} teams to search in`);
    } catch (error) {
      log('debug', `Error getting teams: ${error.message}`);
      if (error.response?.data) {
        log('debug', `Teams API response: ${JSON.stringify(error.response.data)}`);
      }
    }

    // First try personal account (no team)
    let projectFound = null;
    log('debug', `Searching for project ${project.projectName} in personal account`);

    try {
      const projectsUrl = 'https://api.vercel.com/v9/projects';
      const config = {
        headers: { Authorization: vercelToken }
      };

      const projectsResp = await axios.get(projectsUrl, config);
      const projects = projectsResp.data.projects || [];
      log('debug', `Found ${projects.length} projects in personal account`);

      projectFound = projects.find((p) => p.name === project.projectName);
      if (projectFound) {
        log(
          'debug',
          `Found project ${project.projectName} with ID ${projectFound.id} in personal account`
        );
        return {
          projectId: projectFound.id,
          teamId: null
        };
      }
    } catch (error) {
      log('debug', `Error searching in personal account: ${error.message}`);
    }

    // Then try each team
    for (const team of teams) {
      try {
        log('debug', `Searching for project in team: ${team.slug} (${team.id})`);
        const projectsUrl = 'https://api.vercel.com/v9/projects';
        const config = {
          headers: { Authorization: vercelToken },
          params: { teamId: team.id }
        };

        const projectsResp = await axios.get(projectsUrl, config);
        const projects = projectsResp.data.projects || [];
        log('debug', `Found ${projects.length} projects in team ${team.slug}`);

        projectFound = projects.find((p) => p.name === project.projectName);
        if (projectFound) {
          log(
            'debug',
            `Found project ${project.projectName} with ID ${projectFound.id} in team ${team.slug}`
          );
          return {
            projectId: projectFound.id,
            teamId: team.id
          };
        }
      } catch (error) {
        log('debug', `Error searching in team ${team.slug}: ${error.message}`);
      }
    }

    throw new Error(`Project ${project.projectName} not found in any team or personal account`);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to get project ID: ${msg}`);
  }
}

/**
 * Retrieve current environment variables from the Vercel API
 */
async function getCurrentVercelEnvVars(projectId, token, teamId) {
  const vercelToken = getVercelToken(token);

  try {
    const url = `https://api.vercel.com/v9/projects/${projectId}/env`;
    const config = {
      headers: { Authorization: vercelToken },
      ...(teamId ? { params: { teamId } } : {})
    };

    const resp = await axios.get(url, config);
    const envs = resp.data.envs || [];
    log('debug', `Fetched ${envs.length} environment variables`);

    const envVars = {};
    envs.forEach((entry) => {
      envVars[entry.key] = entry.value || '';
    });

    return envVars;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to fetch environment vars: ${msg}`);
  }
}

/**
 * Encrypt a value using a project-specific key
 */
function encryptValue(value, projectId) {
  const keyBase = `${projectId}_bws_secure_salt`;
  const key = crypto.createHash('sha256').update(keyBase).digest();
  const nonce = crypto.randomBytes(12); // 12 bytes is optimal for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `BWS_ENC_${nonce.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Read environment variables for a Vercel project
 */
async function readVars(project, token) {
  const result = {
    found: {},
    missing: [],
    excluded: project.exclusions || []
  };

  try {
    log('debug', `Reading variables for Vercel project: ${project.projectName}`);
    const { projectId, teamId } = await getProjectIdFromName(project, token);
    if (!projectId) {
      throw new Error(`Could not resolve projectId for ${project.projectName}`);
    }

    const platformVars = await getCurrentVercelEnvVars(projectId, token, teamId);
    Object.entries(platformVars).forEach(([key, value]) => {
      result.found[key] = value;
    });
  } catch (error) {
    log('warn', `Failed to fetch Vercel environment: ${error.message}`);
  }

  return result;
}

/**
 * Delete an environment variable from Vercel
 */
async function deleteVercelEnvVar(projectId, envId, token, teamId) {
  const vercelToken = getVercelToken(token);

  try {
    const url = `https://api.vercel.com/v9/projects/${projectId}/env/${envId}`;
    const config = {
      headers: { Authorization: vercelToken },
      ...(teamId ? { params: { teamId } } : {})
    };

    await axios.delete(url, config);
    return true;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to delete env var ${envId}: ${msg}`);
  }
}

/**
 * Finds the environment variable (by key) from the /v9/projects/:id/env response array
 * so we can update or remove it. Returns the entire object if found, or null if not.
 */
function findVercelEnvByKey(envsArray, key) {
  return envsArray.find((item) => item.key === key) || null;
}

/**
 * Create a shared environment variable at the team level
 */
async function createSharedSecret(key, value, token, teamId) {
  const vercelToken = getVercelToken(token);

  try {
    const url = 'https://api.vercel.com/v2/env';
    const payload = {
      key,
      value,
      type: 'secret',
      teamId
    };

    const config = {
      headers: {
        'Authorization': vercelToken,
        'Content-Type': 'application/json'
      }
    };

    await axios.post(url, payload, config);
    log('debug', `Created shared secret ${key}`);
    return true;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to create shared secret: ${msg}`);
  }
}

/**
 * Create a new environment variable in Vercel
 */
async function createVercelEnvVar(projectId, key, value, token, target, teamId) {
  const vercelToken = getVercelToken(token);

  try {
    const url = `https://api.vercel.com/v9/projects/${projectId}/env`;
    const payload = {
      key,
      value,
      target: target,
      type: 'encrypted',
      gitBranch: null,
      sensitive: true
    };

    const config = {
      headers: {
        'Authorization': vercelToken,
        'Content-Type': 'application/json'
      },
      ...(teamId ? { params: { teamId } } : {})
    };

    await axios.post(url, payload, config);
    log('debug', `Created sensitive env var ${key}`);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to create env var ${key}: ${msg}`);
  }
}

/**
 * Helper function to decrypt a value at runtime
 * This should be used in your application code
 */
function decryptEnvVar(encryptedValue, projectId) {
  if (!encryptedValue.startsWith('BWS_ENC_')) {
    return encryptedValue;
  }
  try {
    const [nonceBase64, authTagBase64, encrypted] = encryptedValue
      .replace('BWS_ENC_', '')
      .split(':');
    const nonce = Buffer.from(nonceBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const keyBase = `${projectId}_bws_secure_salt`;
    const key = crypto.createHash('sha256').update(keyBase).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    log('error', `Failed to decrypt value: ${error.message}`);
    return encryptedValue;
  }
}

/**
 * Update environment variables for a Vercel project
 */
async function updateVars(project, token, vars, target) {
  const updated = {};

  try {
    const projectId = await getProjectIdFromName(project, token);
    if (!projectId) {
      throw new Error(`Could not resolve projectId for ${project.projectName}`);
    }

    const vercelToken = getVercelToken(token);

    // Get current env vars
    const url = `https://api.vercel.com/v9/projects/${projectId}/env`;
    const cached = vercelEnvCache.get(projectId);
    const teamId = cached?.teamId;
    const config = {
      headers: { Authorization: vercelToken },
      ...(teamId ? { params: { teamId } } : {})
    };

    const resp = await axios.get(url, config);
    const existingEnvs = resp.data.envs || [];

    log('debug', `Setting variables for ${target.join(', ')} environment(s)`);

    // Delete existing vars unless excluded/preserved
    for (const { key, id, target: envTarget } of existingEnvs) {
      // Skip if excluded/preserved
      if (project.exclusions?.includes(key) || project.preserveVars?.includes(key)) {
        log('debug', `Skipping ${key} (excluded/preserved)`);
        continue;
      }

      // Only delete if the variable is for our current target environment(s)
      const shouldDelete = envTarget.some((t) => target.includes(t));
      if (shouldDelete) {
        await deleteVercelEnvVar(projectId, id, vercelToken, teamId);
        log('debug', `Deleted ${key} from ${envTarget.join(', ')}`);
      }
    }

    // Create new vars
    for (const [key, value] of Object.entries(vars)) {
      if (project.exclusions?.includes(key)) {
        log('debug', `Skipping excluded var ${key}`);
        continue;
      }
      if (project.preserveVars?.includes(key)) {
        log('debug', `Skipping preserved var ${key}`);
        continue;
      }

      try {
        await createVercelEnvVar(projectId, key, value, vercelToken, target, teamId);
        log('debug', `Created ${key} for ${target.join(', ')}`);
        updated[key] = value;
      } catch (error) {
        log('error', `Failed to create ${key}: ${error.message}`);
      }
    }

    return { updated };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to update environment variables: ${msg}`);
  }
}

/**
 * Create multiple environment variables in Vercel in a single batch request
 */
async function batchCreateVercelEnvVars(projectId, envVars, token, teamId) {
  const vercelToken = getVercelToken(token);

  try {
    const url = `https://api.vercel.com/v9/projects/${projectId}/env`;
    const payload = envVars.map((envVar) => ({
      key: envVar.key,
      value: envVar.value,
      target: envVar.target,
      type: 'encrypted',
      gitBranch: null,
      sensitive: true
    }));

    const config = {
      headers: {
        'Authorization': vercelToken,
        'Content-Type': 'application/json'
      },
      ...(teamId ? { params: { teamId } } : {})
    };

    const response = await axios.post(url, payload, config);
    const createdVars = response.data.envs || [];

    // Fix: Ensure we return a consistent array format with key properties
    // This helps the counting logic accurately determine success/failure
    if (createdVars.length > 0) {
      log('debug', `Successfully created ${createdVars.length} environment variables in batch`);
      return createdVars.map((env) => ({
        key: env.key,
        id: env.id,
        created: true
      }));
    } else if (response.status >= 200 && response.status < 300) {
      // API returned success but no env data - map original keys as successful
      log('debug', `API returned success but no environment variables data`);
      return envVars.map((env) => ({
        key: env.key,
        created: true
      }));
    } else {
      // Empty result - return empty array to signal no creations
      log('debug', `API returned empty result`);
      return [];
    }
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to create environment variables in batch: ${msg}`);
  }
}

/**
 * Delete multiple environment variables from Vercel in parallel batches
 */
async function batchDeleteVercelEnvVars(projectId, envVarsToDelete, token, teamId) {
  const vercelToken = getVercelToken(token);
  const results = {
    successful: [],
    failed: []
  };

  try {
    // Create delete promises for all variables
    const deletePromises = envVarsToDelete.map(({ id, key }) => {
      return deleteVercelEnvVar(projectId, id, vercelToken, teamId)
        .then(() => {
          results.successful.push(key);
          return { success: true, key };
        })
        .catch((error) => {
          results.failed.push({ key, error: error.message });
          return { success: false, key, error: error.message };
        });
    });

    // Execute all delete operations in parallel
    await Promise.all(deletePromises);

    log(
      'debug',
      `Batch deletion complete: ${results.successful.length} successful, ${results.failed.length} failed`
    );
    return results;
  } catch (error) {
    log('error', `Error in batch deletion: ${error.message}`);
    log('error', `Critical Error: Failed to delete Vercel environment variables`);
    process.exit(1); // Immediately exit with error code
  }
}

async function updateVercelEnvVars(project) {
  const validation = validateDeployment(project);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Define batchSize once at the top of the function to avoid duplicate declarations
  const batchSize = 10;

  try {
    // CRITICAL: Check that SITE_NAME is set for Vercel projects
    if (process.env.VERCEL === '1' && !process.env.SITE_NAME && !process.env.BWS_PROJECT) {
      throw new Error(
        'Critical Error: SITE_NAME or BWS_PROJECT environment variable must be set for Vercel deployments'
      );
    }

    // Load ALL variables into process.env first
    const prodVars = loadEnvironmentVariables('.env.secure.prod', process.env.BWS_EPHEMERAL_KEY);
    const devVars = loadEnvironmentVariables('.env.secure.dev', process.env.BWS_EPHEMERAL_KEY);

    if (!prodVars || Object.keys(prodVars).length === 0) {
      throw new Error('Critical Error: No production variables found in .env.secure.prod');
    }

    // After loading all vars
    log(
      'debug',
      `Loaded ${Object.keys(prodVars || {}).length} total production variables into process.env`
    );
    log(
      'debug',
      `Loaded ${Object.keys(devVars || {}).length} total development variables into process.env`
    );

    // Now load required vars from requiredVars.env
    const requiredVarsPath = path.join(__dirname, '..', 'requiredVars.env');
    const requiredVarsContent = await fs.promises.readFile(requiredVarsPath, 'utf8');

    // Parse required vars (excluding comments and empty lines)
    const requiredVars = new Set(
      requiredVarsContent
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.trim())
    );

    // Filter vars to only include required ones for Vercel upload
    const filteredProdVars = Object.fromEntries(
      Object.entries(prodVars || {}).filter(([key]) => requiredVars.has(key))
    );
    const filteredDevVars = Object.fromEntries(
      Object.entries(devVars || {}).filter(([key]) => requiredVars.has(key))
    );

    // After filtering
    log(
      'debug',
      `Filtered to ${
        Object.keys(filteredProdVars).length
      } required production variables for Vercel upload`
    );
    log(
      'debug',
      `Filtered to ${
        Object.keys(filteredDevVars).length
      } required development variables for Vercel upload`
    );

    // Add BWS_PROJECT and BWS_ENV to the filtered vars
    filteredProdVars.BWS_PROJECT = project.projectName;
    filteredProdVars.BWS_ENV = 'prod';
    filteredDevVars.BWS_PROJECT = project.projectName;
    filteredDevVars.BWS_ENV = 'dev';

    // Get the project ID and team ID by searching through all teams
    log('debug', `Looking up project ${project.projectName} across all teams`);
    const { projectId, teamId } = await getProjectIdFromName(project);

    if (!projectId) {
      throw new Error('Could not determine Vercel project ID');
    }

    log('debug', `Found project ID: ${projectId}${teamId ? `, team ID: ${teamId}` : ''}`);

    // First, get all current variables to delete
    const vercelToken = getVercelToken(null);
    const url = `https://api.vercel.com/v9/projects/${projectId}/env`;
    const config = {
      headers: { Authorization: vercelToken },
      ...(teamId ? { params: { teamId } } : {})
    };

    const resp = await axios.get(url, config);
    const existingEnvs = resp.data.envs || [];

    // Gather IDs of variables to delete (excluding preserved ones)
    const envVarsToDelete = existingEnvs.filter(({ key }) => !shouldPreserveVar(key, project));

    log('debug', `Found ${envVarsToDelete.length} environment variables to delete`);

    // Delete variables in batches with retry logic
    if (envVarsToDelete.length > 0) {
      log('debug', 'Deleting environment variables in batches');

      // Process deletions in batches
      let totalFailedDeletions = 0;
      let allFailedItems = [];

      for (let i = 0; i < envVarsToDelete.length; i += batchSize) {
        const batch = envVarsToDelete.slice(i, i + batchSize);

        // Try up to 3 times to delete this batch
        let attempts = 0;
        let remainingToDelete = [...batch];

        while (remainingToDelete.length > 0 && attempts < 3) {
          attempts++;
          try {
            log(
              'debug',
              `Deleting batch ${Math.floor(i / batchSize) + 1} (${
                remainingToDelete.length
              } variables) (attempt ${attempts})`
            );

            const results = await batchDeleteVercelEnvVars(
              projectId,
              remainingToDelete,
              vercelToken,
              teamId
            );

            // Update remaining items to delete with only those that failed
            remainingToDelete = remainingToDelete.filter(({ key }) =>
              results.failed.some((f) => f.key === key)
            );

            if (results.failed.length > 0) {
              log('warn', `Failed to delete ${results.failed.length} variables in this batch`);

              // Add random timeout before retry attempts to avoid concurrent API issues
              if (remainingToDelete.length > 0 && attempts < 3) {
                const timeout = getRandomTimeout();
                log(
                  'debug',
                  `Waiting ${timeout / 1000} seconds before retry attempt ${attempts + 1}`
                );
                await new Promise((resolve) => setTimeout(resolve, timeout));
              }
            }
          } catch (error) {
            log('warn', `Batch deletion attempt ${attempts} failed: ${error.message}`);

            // Add random timeout before retry attempts
            if (attempts < 3) {
              const timeout = getRandomTimeout();
              log(
                'debug',
                `Waiting ${timeout / 1000} seconds before retry attempt ${attempts + 1}`
              );
              await new Promise((resolve) => setTimeout(resolve, timeout));
            }
          }
        }

        // If we still have items that failed to delete after 3 attempts, track them as permanent failures
        if (remainingToDelete.length > 0) {
          totalFailedDeletions += remainingToDelete.length;
          allFailedItems.push(...remainingToDelete.map((v) => v.key));

          log(
            'warn',
            `Failed to delete ${
              remainingToDelete.length
            } variables after 3 attempts: ${remainingToDelete.map((v) => v.key).join(', ')}`
          );

          // CRITICAL CHANGE: If ANY variables consistently fail to delete after all retry attempts, fail the build
          log(
            'error',
            `Critical Error: Vercel environment update failed. Could not delete variables: ${allFailedItems.join(
              ', '
            )}`
          );
          process.exit(1);
        }

        // Add a random delay between batches
        if (i + batchSize < envVarsToDelete.length) {
          const timeout = getRandomTimeout();
          log(
            'debug',
            `Adding delay of ${
              timeout / 1000
            } seconds between deletion batches to avoid rate limiting`
          );
          await new Promise((resolve) => setTimeout(resolve, timeout));
        }
      }

      // After handling deletions, now create the new variables
      // First we need to prepare the environment variables for production and preview
      const envVarsForProduction = [];
      const envVarsForPreview = [];

      log('debug', 'Preparing environment variables for Vercel deployment...');

      // Build the array of environment variables for production
      for (const [key, value] of Object.entries(filteredProdVars)) {
        // Skip if this variable is excluded or preserved
        if (project.exclusions?.includes(key) || shouldPreserveVar(key, project)) {
          log('debug', `Skipping ${key} (excluded/preserved)`);
          continue;
        }

        envVarsForProduction.push({
          key,
          value,
          target: ['production']
        });
      }

      // Build the array of environment variables for preview/development
      for (const [key, value] of Object.entries(filteredDevVars)) {
        // Skip if this variable is excluded or preserved
        if (project.exclusions?.includes(key) || shouldPreserveVar(key, project)) {
          log('debug', `Skipping ${key} (excluded/preserved)`);
          continue;
        }

        envVarsForPreview.push({
          key,
          value,
          target: ['preview', 'development']
        });
      }

      log('debug', `Prepared ${envVarsForProduction.length} production variables for upload`);
      log('debug', `Prepared ${envVarsForPreview.length} preview variables for upload`);

      // Create variables in batches
      let creationSuccessCount = 0;
      let creationFailureCount = 0;
      const failedCreations = [];

      // Process production variables
      if (envVarsForProduction.length > 0) {
        log('debug', `Creating ${envVarsForProduction.length} production variables in batches`);

        for (let i = 0; i < envVarsForProduction.length; i += batchSize) {
          const batch = envVarsForProduction.slice(i, i + batchSize);

          try {
            log(
              'debug',
              `Processing production batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
                envVarsForProduction.length / batchSize
              )}`
            );

            const created = await batchCreateVercelEnvVars(projectId, batch, vercelToken, teamId);

            // Fix success counting - only count variables with confirmed creation
            if (created && Array.isArray(created)) {
              creationSuccessCount += created.length;

              // Only count failures for items that weren't in the response
              if (created.length < batch.length) {
                const createdKeys = created.map((item) => item.key);
                const missingKeys = batch.filter((item) => !createdKeys.includes(item.key));

                creationFailureCount += missingKeys.length;
                missingKeys.forEach((item) => {
                  failedCreations.push({
                    key: item.key,
                    error: 'Variable not included in API response'
                  });
                });
              }
            } else {
              // If the API returned a non-array response, count all batch items as failures
              creationFailureCount += batch.length;
              batch.forEach((item) => {
                failedCreations.push({
                  key: item.key,
                  error: 'API response format unexpected'
                });
              });
            }

            // Add a random delay between batches
            if (i + batchSize < envVarsForProduction.length) {
              const timeout = getRandomTimeout();
              log('debug', `Adding delay of ${timeout / 1000} seconds between production batches`);
              await new Promise((resolve) => setTimeout(resolve, timeout));
            }
          } catch (error) {
            log('warn', `Failed to create batch of production variables: ${error.message}`);
            creationFailureCount += batch.length;
            batch.forEach((item) => {
              failedCreations.push({
                key: item.key,
                error: error.message
              });
            });
          }
        }
      }

      // Process preview variables
      if (envVarsForPreview.length > 0) {
        log('debug', `Creating ${envVarsForPreview.length} preview variables in batches`);

        for (let i = 0; i < envVarsForPreview.length; i += batchSize) {
          const batch = envVarsForPreview.slice(i, i + batchSize);

          try {
            log(
              'debug',
              `Processing preview batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
                envVarsForPreview.length / batchSize
              )}`
            );

            const created = await batchCreateVercelEnvVars(projectId, batch, vercelToken, teamId);

            // Fix success counting - only count variables with confirmed creation
            if (created && Array.isArray(created)) {
              creationSuccessCount += created.length;

              // Only count failures for items that weren't in the response
              if (created.length < batch.length) {
                const createdKeys = created.map((item) => item.key);
                const missingKeys = batch.filter((item) => !createdKeys.includes(item.key));

                creationFailureCount += missingKeys.length;
                missingKeys.forEach((item) => {
                  failedCreations.push({
                    key: item.key,
                    error: 'Variable not included in API response'
                  });
                });
              }
            } else {
              // If the API returned a non-array response, count all batch items as failures
              creationFailureCount += batch.length;
              batch.forEach((item) => {
                failedCreations.push({
                  key: item.key,
                  error: 'API response format unexpected'
                });
              });
            }

            // Add a random delay between batches
            if (i + batchSize < envVarsForPreview.length) {
              const timeout = getRandomTimeout();
              log('debug', `Adding delay of ${timeout / 1000} seconds between preview batches`);
              await new Promise((resolve) => setTimeout(resolve, timeout));
            }
          } catch (error) {
            log('warn', `Failed to create batch of preview variables: ${error.message}`);
            creationFailureCount += batch.length;
            batch.forEach((item) => {
              failedCreations.push({
                key: item.key,
                error: error.message
              });
            });
          }
        }
      }

      // Calculate total variables and track results
      const totalVariables = envVarsForProduction.length + envVarsForPreview.length;
      log(
        'debug',
        `Variable creation results: ${creationSuccessCount} successful, ${creationFailureCount} failed`
      );

      // MODIFIED: Immediately fail if ANY variables fail to create
      if (creationFailureCount > 0) {
        const failedKeys = failedCreations.map((item) => item.key).join(', ');
        log(
          'error',
          `Critical Error: Failed to create ${creationFailureCount} environment variables. Failed variables: ${failedKeys}`
        );
        process.exit(1);
      }

      log('info', 'Vercel environment variables updated successfully');
      return {
        updated: {
          production: envVarsForProduction.length,
          preview: envVarsForPreview.length
        }
      };
    }
  } catch (error) {
    log('error', `Failed to update Vercel environment: ${error.message}`);
    process.exit(1);
  }
}

export {
  readVars,
  updateVars,
  getProjectIdFromName,
  getCurrentVercelEnvVars,
  deleteVercelEnvVar,
  decryptEnvVar,
  updateVercelEnvVars,
  batchCreateVercelEnvVars,
  batchDeleteVercelEnvVars
};
