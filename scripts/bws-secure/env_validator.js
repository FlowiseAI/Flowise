/* eslint-disable no-console */
// Validate the required environment variables before starting the build process.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(level, message) {
  const prefix =
    {
      error: colors.red + 'ERROR:',
      warn: colors.yellow + 'WARNING:',
      info: colors.green + 'INFO:',
      success: colors.green + 'SUCCESS:'
    }[level] || '';
  console.log(`${prefix} ${message}${colors.reset}`);
}

// Common environment variables that can be excluded
const envCheckExclusions = [
  'ALGOLIA_MAX_RECORDS',
  'ANALYZE_BUNDLE',
  'CONTENTFUL_SETTINGS_ID',
  'CYPRESS_PROJECT_ID',
  'CYPRESS_RECORD_KEY',
  'DEPLOY_URL',
  'fsaStoreKey',
  'fsaStoreURL',
  'GRAPHQL_SERVER_URL',
  'HEAD',
  'NEXT_PUBLIC_CONTENTFUL_USE_PREVIEW_MODE',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NODE_ENV',
  'PAGES_REVALIDATE',
  'PORT',
  'REDIS_USERNAME',
  'SITE_SETTINGS',
  'VERCEL_URL',
  'BWS_TEST_VAR',
  'BWS_SECRET_TEST_VAR'
];

// Get variables from turbo.json
function getTurboVars() {
  try {
    const turboConfigPath = path.join(__dirname, '../../turbo.json');
    if (!fs.existsSync(turboConfigPath)) {
      log('warn', 'No turbo.json found - skipping turbo validation');
      return [];
    }

    const turboConfig = JSON.parse(fs.readFileSync(turboConfigPath, 'utf8'));
    return [...(turboConfig.tasks?.build?.env || []), ...(turboConfig.globalEnv || [])];
  } catch (error) {
    log('warn', `Error reading turbo.json: ${error.message}`);
    return [];
  }
}

// Get variables from requiredVars.env
function getRuntimeVars() {
  try {
    const requiredVarsPath = path.join(__dirname, 'requiredVars.env');
    if (!fs.existsSync(requiredVarsPath)) {
      log('warn', 'No requiredVars.env found - runtime vars not scanned');
      return [];
    }

    return fs
      .readFileSync(requiredVarsPath, 'utf8')
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.trim());
  } catch (error) {
    log('warn', `Error reading requiredVars.env: ${error.message}`);
    return [];
  }
}

// Main validation
function validateEnvironment() {
  log('info', 'Starting environment validation...');

  const turboVars = getTurboVars();
  const runtimeVars = getRuntimeVars();

  // Combine both sets of variables, removing duplicates
  const allRequiredVars = [...new Set([...turboVars, ...runtimeVars])];

  // Check which vars are missing
  const missingVars = allRequiredVars.filter(
    (varName) => !process.env[varName] && !envCheckExclusions.includes(varName)
  );

  // Report findings
  if (missingVars.length > 0) {
    log('warn', 'The following environment variables are missing:');
    missingVars.forEach((varName) => {
      const inTurbo = turboVars.includes(varName);
      const inRuntime = runtimeVars.includes(varName);
      const source =
        inTurbo && inRuntime ? 'turbo.json & runtime' : inTurbo ? 'turbo.json' : 'runtime scan';
      console.log(`  ${colors.yellow}${varName}${colors.reset} (${source})`);
    });

    // Don't fail the build, just warn
    log('warn', 'Some environment variables are missing but continuing build...');
    return true;
  }

  log('success', 'All required environment variables are set');
  return true;
}

// Execute validation
validateEnvironment();
