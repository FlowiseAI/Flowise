#!/usr/bin/env node

/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function listProjects() {
  const configPath = path.join(__dirname, '../../bwsconfig.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log('\nAvailable Projects:\n');

  config.projects.forEach((project) => {
    console.log(`\x1b[36m${project.projectName}\x1b[0m`);
    console.log(`  Platform: ${project.platform}`);
    console.log('');
  });

  console.log('\nTo use a specific project:');
  console.log('1. Add to your .env file:');
  console.log('   BWS_PROJECT=project-name');
  console.log('\n2. Or run with environment variable:');
  console.log('   BWS_PROJECT=project-name pnpm dev\n');
}

listProjects();
