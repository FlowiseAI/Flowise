#!/usr/bin/env node

/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv with better path resolution
const possibleEnvPaths = [
  path.join(process.cwd(), '.env'), // Root directory
  path.join(__dirname, '../../.env'), // Two levels up
  path.join(__dirname, '../.env'), // One level up
  path.join(__dirname, '.env') // Same directory
];

// Try to find the first existing .env file
const envPath = possibleEnvPaths.find((path) => fs.existsSync(path));

if (envPath) {
  console.log(`\x1b[36mLoading .env from:\x1b[0m ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('\x1b[33mNo .env file found in common locations. Using process.env directly.\x1b[0m');
  // Still call config() to ensure dotenv is initialized
  dotenv.config();
}

// Log environment loading status
console.log('\x1b[32mEnvironment Status:\x1b[0m', {
  NODE_ENV: process.env.NODE_ENV || 'not set',
  NETLIFY: process.env.NETLIFY ? 'true' : 'false',
  VERCEL: process.env.VERCEL ? '1' : '0',
  ENV_PATH: envPath || 'using process.env',
  VARS_COUNT: Object.keys(process.env).length
});

console.log('Available Environment Variables:', Object.keys(process.env).length);
console.log('Sample Variable:', process.env.BWS_TEST_VAR || process.env.BWS_SECRET_TEST_VAR); // To verify .env loading

// Array of important variables to check
const IMPORTANT_VARS = ['BWS_TEST_VAR', 'BWS_SECRET_TEST_VAR'];

// Log the values of important variables
console.log('\x1b[33mImportant Variables Values:\x1b[0m');
IMPORTANT_VARS.forEach((varName) => {
  console.log(`${varName}: "${process.env[varName]}"`);
});

// Function to safely display environment variables
const sanitizeEnvValue = (value) => {
  if (!value) return 'NOT SET';
  return value; // Remove sanitization to show full values
};

// Get all environment variables in a structured format
const getAllEnvVars = () => {
  // Return the complete process.env object
  return Object.fromEntries(
    Object.entries(process.env)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, sanitizeEnvValue(value)])
  );
};

// Generate status indicators for important variables
const generateStatusIndicators = () => {
  return IMPORTANT_VARS.map(
    (varName) => `
    <div class="status ${process.env[varName] ? 'success' : 'error'}">
      ${varName}: ${process.env[varName] ? 'Available ✓' : 'Not Available ✗'}
      <br>
      <span class="env-value">Value: ${process.env[varName] || 'undefined'}</span>
    </div>
  `
  ).join('\n');
};

// Update the getDirectoryStructure function to handle permissions better
const getDirectoryStructure = (startPath, depth = 3) => {
  if (depth < 0) return null;
  if (!fs.existsSync(startPath)) return `Directory does not exist: ${startPath}`;

  const structure = {};

  try {
    const items = fs.readdirSync(startPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(startPath, item.name);

      try {
        if (item.isDirectory()) {
          structure[item.name + '/'] =
            depth > 0 ? getDirectoryStructure(itemPath, depth - 1) : '...';
        } else if (item.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(itemPath);
          structure[item.name] = `-> ${linkTarget}`;
        } else {
          structure[item.name] = null;
        }
      } catch (itemError) {
        structure[item.name] = `<access denied: ${itemError.code}>`;
      }
    }
  } catch (error) {
    return `<error reading directory: ${error.code}>`;
  }

  return structure;
};

// Update buildInfo to include more system directories
const buildInfo = {
  NODE_ENV: process.env.NODE_ENV,
  BUILD_TIME: new Date().toISOString(),
  PLATFORM: process.platform,
  ARCHITECTURE: process.arch,
  NODE_VERSION: process.version,
  PROCESS_ID: process.pid,
  PROCESS_TITLE: process.title,
  PROCESS_UPTIME: process.uptime(),
  MEMORY_USAGE: process.memoryUsage(),
  CPU_USAGE: process.cpuUsage(),
  CURRENT_DIR: process.cwd(),
  EXECUTABLE_PATH: process.execPath,
  // Add these new properties
  ROOT_DIRECTORY: getDirectoryStructure('/'),
  HOME_DIRECTORY: getDirectoryStructure(process.env.HOME),
  CURRENT_DIRECTORY: getDirectoryStructure(process.cwd()),
  SYSTEM_DIRECTORIES: {
    'Root (/)': getDirectoryStructure('/', 1),
    'Opt (/opt)': getDirectoryStructure('/opt', 2),
    'Build (/opt/build)': getDirectoryStructure('/opt/build', 2),
    'BuildHome (/opt/buildhome)': getDirectoryStructure('/opt/buildhome', 2),
    'Current Directory': getDirectoryStructure(process.cwd(), 2)
  },
  PROCESS_INFO: {
    NODE_ENV: process.env.NODE_ENV,
    BUILD_TIME: new Date().toISOString(),
    PLATFORM: process.platform,
    ARCHITECTURE: process.arch,
    NODE_VERSION: process.version,
    PROCESS_ID: process.pid,
    PROCESS_TITLE: process.title,
    PROCESS_UPTIME: process.uptime(),
    MEMORY_USAGE: process.memoryUsage(),
    CPU_USAGE: process.cpuUsage(),
    CURRENT_DIR: process.cwd(),
    EXECUTABLE_PATH: process.execPath
  }
};

// Create HTML content with injected environment variables
const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Build Environment Debug</title>
    <style>
      body { margin: 0; padding: 20px; background: #1a1a1a; color: #fff; font-family: monospace; }
      .container { background: #2a2a2a; padding: 20px; border-radius: 8px; }
      pre { background: #333; padding: 15px; border-radius: 4px; overflow-x: auto; }
      .status { 
        padding: 8px 16px;
        border-radius: 4px;
        display: inline-block;
        margin-right: 10px;
        margin-bottom: 10px;
      }
      .success { background: #1b5e20; }
      .error { background: #b71c1c; }
      .env-var { margin: 5px 0; }
      .env-key { color: #66bb6a; }
      .env-value { color: #90caf9; }
      .status-container {
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Build Environment Debug</h1>
      <h3>Generated at: ${new Date().toISOString()}</h3>
      
      <h2>Critical Variables Status</h2>
      <div class="status-container">
        ${generateStatusIndicators()}
      </div>

      <h2>Environment Summary</h2>
      <div class="status ${Object.keys(process.env).length > 0 ? 'success' : 'error'}">
        Total Environment Variables: ${Object.keys(process.env).length}
      </div>

      <h2>All Environment Variables</h2>
      <pre>${JSON.stringify(getAllEnvVars(), null, 2)}</pre>

      <h2>Process Information</h2>
      <pre>${JSON.stringify(buildInfo.PROCESS_INFO, null, 2)}</pre>

      <h2>System Directory Structure</h2>
      <pre>${JSON.stringify(buildInfo.SYSTEM_DIRECTORIES, null, 2)}</pre>
    </div>
  </body>
</html>`;

// Update the public directory path to ensure it works with Netlify
const publicDir = process.env.NETLIFY
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '../../public');

// Add more detailed logging
console.log(`\x1b[34mCreating public directory at:\x1b[0m ${publicDir}`);
if (!fs.existsSync(publicDir)) {
  console.log(`Public directory doesn't exist, creating it...`);
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`✓ Created public directory`);
}

// Write the file with more detailed logging
const outputPath = path.join(publicDir, 'index.html');
console.log(`\x1b[32mWriting debug information to:\x1b[0m ${outputPath}`);
fs.writeFileSync(outputPath, htmlContent);
console.log(`\x1b[32m✓ Successfully generated index.html at:\x1b[0m ${outputPath}`);
console.log(`\x1b[35mFound ${Object.keys(process.env).length} environment variables\x1b[0m`);
console.log(`\x1b[36mFile size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)}KB\x1b[0m`);
