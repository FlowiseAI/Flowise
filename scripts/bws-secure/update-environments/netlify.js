/* eslint-disable no-console */
/**
 * netlify.js
 *
 * This module contains all Netlify-specific operations for reading and updating
 * environment variables. It provides the following functions:
 *
 *   readVars(project, token) -> { found: {}, missing: [], excluded: [] }
 *   updateVars(project, token, vars) -> { updated: {} }
 *
 * The code interacts with Netlify via the REST API and requires an API token.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import {
  log,
  handleError,
  loadEnvironmentVariables,
  validateDeployment,
  shouldPreserveVar as shouldPreserveVariable,
  getBuildOrAuthToken
} from './utils.js';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local in-memory cache for Netlify environment variables (if needed for caching)
const netlifyEnvironmentCache = new Map();

/**
 * Helper function to handle API rate limiting with exponential backoff
 *
 * @param {Function} apiCall - The function that makes the API call
 * @param {Number} maxRetries - Maximum number of retries (default: 3)
 * @param {Number} initialDelay - Initial delay in ms (default: 1000)
 */
async function withRateLimitRetry(apiCall, maxRetries = 3, initialDelay = 1000) {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await apiCall();
    } catch (error) {
      // Check if the error is a rate limit (429)
      if (error.response?.status === 429 && retries < maxRetries) {
        // Get retry delay from header if available, otherwise use exponential backoff
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;

        retries++;
        log(
          'warn',
          `Rate limit exceeded (429). Retrying in ${
            waitTime / 1000
          }s (Attempt ${retries}/${maxRetries})`
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Increase delay for next potential retry (exponential backoff)
        delay *= 2;
      } else {
        // Not a rate limit error or we've run out of retries
        throw error;
      }
    }
  }
}

/**
 * Main function to update Netlify environment variables in batch.
 */
async function updateNetlifyEnvironmentVariables(project) {
  // 1) Validate deployment
  const validation = validateDeployment(project);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    // 2) Load environment variables from .env.secure.prod and .env.secure.dev
    const productionVariablesAll =
      loadEnvironmentVariables('.env.secure.prod', process.env.BWS_EPHEMERAL_KEY) || {};
    const developmentVariablesAll =
      loadEnvironmentVariables('.env.secure.dev', process.env.BWS_EPHEMERAL_KEY) || {};

    log(
      'debug',
      `Loaded ${Object.keys(productionVariablesAll).length} prod vars, ${
        Object.keys(developmentVariablesAll).length
      } dev vars`
    );

    // 3) Load requiredVars from file and ensure BWS_PROJECT and BWS_ENV are always included
    const requiredVariablesPath = path.join(__dirname, '..', 'requiredVars.env');
    const requiredVariablesContent = await fs.promises.readFile(requiredVariablesPath, 'utf8');
    const requiredVariables = new Set(
      requiredVariablesContent
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.trim())
    );
    requiredVariables.add('BWS_PROJECT');
    requiredVariables.add('BWS_ENV');

    // 4) Gather all unique keys from prod and dev files, plus the forced ones
    const allKeys = new Set([
      ...Object.keys(productionVariablesAll),
      ...Object.keys(developmentVariablesAll),
      'BWS_PROJECT',
      'BWS_ENV'
    ]);

    // 5) Get Netlify site info and the list of currently set environment variable keys
    const netlifyToken = getBuildOrAuthToken();
    const site = await getSiteIdFromSlug(project.projectName, netlifyToken);
    if (!site) {
      throw new Error('Could not determine Netlify site ID');
    }
    const existingKeys = await getCurrentNetlifyEnvironmentVariables(site, netlifyToken);

    // 6) Identify keys to delete: keys that exist on Netlify but are not in requiredVars
    //    or are not explicitly preserved/excluded.
    const keysToDelete = existingKeys.filter((existingKey) => {
      const isPreserved = project.preserveVars?.includes(existingKey);
      const isExcluded = project.exclusions?.includes(existingKey);
      if (existingKey === 'BWS_ACCESS_TOKEN' || isPreserved || isExcluded) {
        log('debug', `Skipping deletion of ${existingKey}`);
        return false;
      }
      return true;
    });

    // 7) Build an array of variable objects to update/create
    const variablesToUpdate = [];
    for (const key of allKeys) {
      // Only process required keys
      if (!requiredVariables.has(key)) {
        continue;
      }
      if (project.exclusions?.includes(key) || project.preserveVars?.includes(key)) {
        log('debug', `Skipping update for ${key} (excluded/preserved)`);
        continue;
      }

      // For BWS_PROJECT and BWS_ENV, force specific values
      let productionValue = productionVariablesAll[key];
      let developmentValue = developmentVariablesAll[key];

      if (key === 'BWS_PROJECT') {
        productionValue = project.projectName;
        developmentValue = project.projectName;
      }

      if (key === 'BWS_ENV') {
        productionValue = 'prod';
        developmentValue = 'dev';
      }

      // If both values are missing, skip this key
      if (productionValue === undefined && developmentValue === undefined) {
        log('debug', `Key=${key} has no prod or dev value, skipping.`);
        continue;
      }

      // Build contexts array:
      // - Production context uses prodVal (if available)
      // - Dev contexts (deploy-preview, branch-deploy) use devVal (if available)
      const contexts = [];
      if (productionValue !== undefined) {
        contexts.push({ context: 'production', value: productionValue });
      }
      let developmentContexts = ['deploy-preview', 'branch-deploy'];
      if (project.bwsProjectIds?.deploy_preview || project.bwsProjectIds?.branch_deploy) {
        developmentContexts = [];
        if (project.bwsProjectIds.deploy_preview) {
          developmentContexts.push('deploy-preview');
        }
        if (project.bwsProjectIds.branch_deploy) {
          developmentContexts.push('branch-deploy');
        }
        if (developmentContexts.length === 0) {
          developmentContexts = ['deploy-preview', 'branch-deploy'];
        }
      }
      if (developmentValue !== undefined) {
        for (const context of developmentContexts) {
          contexts.push({ context, value: developmentValue });
        }
      }

      // Log a debug message summarizing the variable being updated,
      // but without showing sensitive information (only context names and value lengths).
      const contextsSummary = contexts.map((c) => ({
        context: c.context,
        valueLength: typeof c.value === 'string' ? c.value.length : 0
      }));
      log(
        'debug',
        `Preparing variable ${key} for update with contexts: ${JSON.stringify(contextsSummary)}`
      );

      // For now, we are setting is_secret to false for all variables.
      variablesToUpdate.push({
        key,
        scopes: ['builds', 'functions', 'runtime'],
        values: contexts,
        is_secret: false
      });
    }

    // 8) Execute deletions in batches to avoid rate limiting
    const batchSize = 5; // Process 5 deletions at a time
    log('debug', `Deleting ${keysToDelete.length} unneeded env vars in batches of ${batchSize}`);

    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);
      log(
        'debug',
        `Processing deletion batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          keysToDelete.length / batchSize
        )}`
      );

      // Process each batch concurrently, but batches themselves are sequential
      await Promise.all(
        batch.map((key) => deleteNetlifyEnvironmentVariable(site, netlifyToken, key))
      );

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < keysToDelete.length) {
        log('debug', 'Adding delay between deletion batches to avoid rate limiting');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    log('debug', `Completed deletion of ${keysToDelete.length} unneeded env vars.`);

    // 9) Perform a batch update for all variables (assuming Netlify API supports an array payload)
    await batchUpdateNetlifyEnvironmentVariables(site, netlifyToken, variablesToUpdate);

    // 10) Log a success message
    console.log('\u001B[32m╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║               Successfully updated Netlify project                 ║');
    console.log(`║                      ${project.projectName.padEnd(46)}║`);
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\u001B[0m');
  } catch (error) {
    log('error', `Failed to update Netlify site ${project.projectName}: ${error.message}`);
    process.exit(1); // Immediately exit with error code instead of just throwing
  }
}

/**
 * batchUpdateNetlifyEnvVars performs a single API call to update/create multiple environment variables.
 * For large batches, it splits them into smaller chunks to avoid rate limiting.
 */
async function batchUpdateNetlifyEnvironmentVariables(site, netlifyToken, variablesArray) {
  try {
    const url = `https://api.netlify.com/api/v1/accounts/${site.account_id}/env`;

    // Split into smaller batches if the array is large
    const maxBatchSize = 20; // Maximum number of variables to update in a single API call

    if (variablesArray.length <= maxBatchSize) {
      // Small enough batch, process normally
      await withRateLimitRetry(async () => {
        await axios.post(url, variablesArray, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': netlifyToken
          },
          params: { site_id: site.id }
        });
      });

      log('debug', `Batch updated ${variablesArray.length} environment variables.`);
    } else {
      // Large batch, split into chunks
      log(
        'debug',
        `Splitting large batch of ${variablesArray.length} variables into smaller chunks of ${maxBatchSize}`
      );

      for (let i = 0; i < variablesArray.length; i += maxBatchSize) {
        const chunk = variablesArray.slice(i, i + maxBatchSize);
        log(
          'debug',
          `Processing update chunk ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(
            variablesArray.length / maxBatchSize
          )}`
        );

        await withRateLimitRetry(async () => {
          await axios.post(url, chunk, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': netlifyToken
            },
            params: { site_id: site.id }
          });
        });

        // Add a delay between chunks to avoid rate limiting
        if (i + maxBatchSize < variablesArray.length) {
          log('debug', 'Adding delay between update batches to avoid rate limiting');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      log(
        'debug',
        `Completed update of all ${variablesArray.length} environment variables in chunks.`
      );
    }
  } catch (error) {
    log('error', `Batch update failed: ${error.message}`);
    log('error', `Critical Error: Failed to update Netlify environment variables`);
    process.exit(1); // Immediately exit with error code
  }
}

/**
 * getSiteIdFromSlug fetches the Netlify site info by matching the project name.
 */
async function getSiteIdFromSlug(projectName, token) {
  try {
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    log('debug', `Looking up site with name: ${projectName}`);

    const response = await withRateLimitRetry(async () => {
      return await axios.get('https://api.netlify.com/api/v1/sites', {
        headers: { Authorization: authToken },
        params: { filter: 'all' }
      });
    });

    let site = response.data.find((s) => s.name === projectName);

    if (!site) {
      site = response.data.find(
        (s) =>
          s.site_id === projectName ||
          s.custom_domain === projectName ||
          s.url.includes(projectName)
      );
    }

    if (!site) {
      throw new Error(
        `Site not found with name/id: ${projectName}.\n` +
          `Available sites: ${response.data.map((s) => `\n- ${s.name} (${s.url})`).join('')}`
      );
    }

    log('debug', `Found site ID ${site.id} for ${projectName} (${site.url})`);
    return site;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid or expired Netlify token');
    } else if (error.response?.status === 403) {
      throw new Error('Token does not have permission to list sites');
    } else if (error.response?.data) {
      throw new Error(`Netlify API error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * getCurrentNetlifyEnvVars returns an array of keys currently set on Netlify.
 */
async function getCurrentNetlifyEnvironmentVariables(site, token) {
  try {
    const url = `https://api.netlify.com/api/v1/accounts/${site.account_id}/env`;

    const response = await withRateLimitRetry(async () => {
      return await axios.get(url, {
        headers: { Authorization: token },
        params: { site_id: site.id }
      });
    });

    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data.map((environmentVariable) => environmentVariable.key);
  } catch (error) {
    if (error.response?.status === 404) {
      log('warn', `404 fetching env for site ${site.id}, returning []`);
      return [];
    }
    throw new Error(`Failed to fetch Netlify environment variables: ${error.message}`);
  }
}

/**
 * deleteNetlifyEnvVar deletes a single environment variable from Netlify.
 */
async function deleteNetlifyEnvironmentVariable(site, token, key) {
  try {
    const url = `https://api.netlify.com/api/v1/accounts/${site.account_id}/env/${key}`;
    const config = {
      headers: { Authorization: token },
      params: { site_id: site.id }
    };

    // Check if the variable exists before deletion
    try {
      await withRateLimitRetry(async () => {
        await axios.get(url, config);
      });
    } catch (error) {
      if (error.response?.status === 404) {
        log('debug', `Variable ${key} not found, skipping delete`);
        return;
      }
      throw error;
    }

    await withRateLimitRetry(async () => {
      await axios.delete(url, config);
    });

    log('debug', `Deleted Netlify env var: ${key} (cleanup)`);
  } catch (error) {
    if (error.response?.status === 404) {
      return;
    }
    log('error', `Critical Error: Failed to delete Netlify env var ${key}: ${error.message}`);
    process.exit(1); // Immediately exit with error code for critical deletion failures
  }
}

/**
 * Stub readVars for potential future use.
 */
async function readVariables(project, token) {
  return {
    found: {},
    missing: [],
    excluded: []
  };
}

export { readVariables as readVars, updateNetlifyEnvironmentVariables as updateNetlifyEnvVars };
