/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import logger from './logger.js';

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

function ensureBwsInstalled() {
  const bwsPath = './node_modules/.bin/bws';
  const bwsExePath = './node_modules/.bin/bws.exe';

  // Check if the binary exists (either Unix or Windows version)
  if (!fs.existsSync(bwsPath) && !fs.existsSync(bwsExePath)) {
    logger.info('bws binary not found. Running bws-installer.sh...');
    try {
      // This works for both Unix systems and Git Bash on Windows
      execSync('sh ./scripts/bws-secure/bws-installer.sh', {
        stdio: 'inherit',
        shell: true
      });
    } catch (error) {
      logger.error(`Error running bws-installer.sh: ${error.message}`);
      process.exit(1);
    }

    // Check again if installation was successful
    if (!fs.existsSync(bwsPath) && !fs.existsSync(bwsExePath)) {
      logger.error('bws binary is still missing after running the installer.');
      process.exit(1);
    }

    logger.info('bws installed successfully.');
  }
}

function encryptContent(plaintext, encryptionKey) {
  const nonce = crypto.randomBytes(12); // 12 bytes is optimal for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), nonce);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${nonce.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

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

function loadBwsSecrets(encryptionKey) {
  // Always load from .env file first
  const environmentConfig = dotenv.config();
  const environmentToken = environmentConfig.parsed?.BWS_ACCESS_TOKEN;

  // Override any existing token with the one from .env
  if (environmentToken) {
    process.env.BWS_ACCESS_TOKEN = environmentToken;
  }

  if (!process.env.BWS_ACCESS_TOKEN) {
    // prettier-ignore
    /* eslint-disable no-console */
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
        '\nVisit the link below to create your token: ' + getMachineAccountsUrl()
      );
    }
    /* eslint-enable no-console */
    return '';
  }

  try {
    ensureBwsInstalled();
    const mergedVariables = {};

    // First, try to load global secrets (auth tokens)
    try {
      console.log('Debug: Loading global secrets...');

      const output = execSync(
        `./node_modules/.bin/bws secret list -t ${process.env.BWS_ACCESS_TOKEN} -o env`,
        {
          encoding: 'utf-8',
          env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
        }
      );

      // These are data processing operations, not command executions
      const cleanOutput = output.replaceAll(/\u001B\[\d+m/g, '').trim();
      const globalSecrets = cleanOutput.split('\n').reduce((accumulator, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          accumulator[key] = value;
        }
        return accumulator;
      }, {});

      // Also just data processing
      for (const { key, value } of globalSecrets) {
        if (key === 'NETLIFY_AUTH_TOKEN' || key === 'VERCEL_AUTH_TOKEN') {
          mergedVariables[key] = value;
          console.log('Debug: Found auth token:', key);
        }
      }
    } catch (globalError) {
      console.warn('Warning: Failed to load global secrets:', globalError.message);
    }

    // Then, if we have a project ID, load project-specific secrets
    if (process.env.BWS_PROJECT_ID) {
      try {
        console.log('Debug: Loading project secrets for:', process.env.BWS_PROJECT_ID);
        // NOSONAR: BWS CLI execution with system-controlled variables - no user input
        /* sonar-disable-next-line sonar:S4721 */
        const projectOutput = execSync(
          `./node_modules/.bin/bws secret list ${process.env.BWS_PROJECT_ID} -t ${process.env.BWS_ACCESS_TOKEN} -o env`,
          {
            encoding: 'utf-8',
            env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
          }
        );

        const projectSecrets = projectOutput.split('\n').reduce((accumulator, line) => {
          const [key, value] = line.split('=');
          if (key && value) {
            accumulator[key] = value;
          }
          return accumulator;
        }, {});

        // More data processing
        for (const { key, value } of projectSecrets) {
          if (key && value) {
            mergedVariables[key] = value;
          }
        }
        console.log('Debug: Loaded project secrets:', Object.keys(mergedVariables).length);
      } catch (projectError) {
        console.warn('Warning: Failed to load project secrets:', projectError.message);
      }
    }

    const environmentContent = Object.entries(mergedVariables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Only create .env.secure if we have content
    if (encryptionKey && environmentContent) {
      try {
        const cipherText = encryptContent(environmentContent, encryptionKey);
        fs.writeFileSync('.env.secure', cipherText, { encoding: 'utf-8' });
        console.log('Debug: Created .env.secure file');

        // Add decryption output if debug and show_decrypted are enabled
        if (process.env.DEBUG === 'true' && process.env.SHOW_DECRYPTED === 'true') {
          console.log('\nDecrypted contents:');
          console.log('-------------------------------------');
          console.log(environmentContent);
          console.log('-------------------------------------\n');
        }
      } catch (error) {
        console.warn(`Failed to encrypt content: ${error.message}`);
      }
    }

    return environmentContent;
  } catch {
    if (process.env.BWS_ACCESS_TOKEN) {
      // prettier-ignore
      /* eslint-disable no-console */
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
          '\nVisit the link below to check or regenerate your token: ' + getMachineAccountsUrl()
        );
      }
      /* eslint-enable no-console */
    }
    return '';
  }
}

async function loadEnvironmentSecrets(environment, projectId) {
  try {
    // Create secure file path using project ID
    const secureFile = path.join(process.cwd(), `.env.secure.${projectId}`);

    console.log(`Loading secrets for project ID: ${projectId}...`);

    // Set BWS_PROJECT_ID for this environment
    process.env.BWS_PROJECT_ID = projectId;

    // Load secrets from BWS
    const environmentContent = loadBwsSecrets(process.env.BWS_EPHEMERAL_KEY);

    if (environmentContent) {
      // Write encrypted content to file
      const cipherText = encryptContent(environmentContent, process.env.BWS_EPHEMERAL_KEY);
      fs.writeFileSync(secureFile, cipherText);

      // Show decrypted contents if debug and show_decrypted are enabled
      if (process.env.DEBUG === 'true' && process.env.SHOW_DECRYPTED === 'true') {
        console.log(`\nDecrypted contents of ${secureFile}:`);
        console.log('-------------------------------------');
        console.log(environmentContent);
        console.log('-------------------------------------\n');
      }

      // Track created files for later use
      const createdFiles = JSON.parse(process.env.BWS_CREATED_FILES || '[]');
      if (!createdFiles.includes(projectId)) {
        createdFiles.push(projectId);
        process.env.BWS_CREATED_FILES = JSON.stringify(createdFiles);
      }

      console.log(`Created secure file: ${secureFile}`);
      return true;
    }
  } catch (error) {
    console.warn(`Warning: Failed to load secrets for project ID ${projectId}: ${error.message}`);
  }
  return false;
}

// Export the function rather than auto-running it
export { loadBwsSecrets, loadEnvironmentSecrets, ensureBwsInstalled };
