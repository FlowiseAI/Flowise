/* eslint-disable no-console */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateVercelEnvVars } from './update-environments/vercel.js';
import { log } from './update-environments/utils.js';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVercelUpload() {
  try {
    // First run secureRun to generate .env.secure.* files
    log('info', 'Generating secure environment files...');
    const secureRun = spawnSync('node', [path.join(__dirname, 'secureRun.js')], {
      stdio: 'inherit'
    });

    if (secureRun.status !== 0) {
      throw new Error('Failed to generate secure environment files');
    }

    // Test configuration
    const project = {
      platform: 'vercel',
      projectName: 'bws-secure-gtmbaduopturkyxzbvgd',
      bwsProjectIds: {
        prod: '18d6743c-22a1-4506-9638-b2500022219c',
        dev: '988278d7-7fa4-4bd2-859f-b25000221968',
        local: '03da5070-5db6-4de5-988c-b25000220b0a'
      },
      preserveVars: ['BWS_ACCESS_TOKEN']
    };

    // Test different environments
    process.env.VERCEL = '1';

    // Test production upload
    log('info', 'Testing production environment upload...');
    process.env.VERCEL_ENV = 'production';
    await updateVercelEnvVars(project);

    // Test preview upload
    log('info', 'Testing preview environment upload...');
    process.env.VERCEL_ENV = 'preview';
    await updateVercelEnvVars(project);
  } catch (error) {
    log('error', `Test failed: ${error.message}`);
    console.error(error);
  }
}

// Start execution
testVercelUpload().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
