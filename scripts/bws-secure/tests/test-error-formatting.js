/* eslint-disable no-console */
import { updateVercelEnvVars } from '../update-environments/vercel.js';
import { log } from '../update-environments/utils.js';

async function testErrorFormatting() {
  try {
    // Test configuration with a non-existent project
    const project = {
      platform: 'vercel',
      projectName: 'non-existent-project-test',
      bwsProjectIds: {
        prod: '12345678-1234-1234-1234-123456789012',
        dev: '12345678-1234-1234-1234-123456789012',
        local: '12345678-1234-1234-1234-123456789012'
      },
      preserveVars: ['BWS_ACCESS_TOKEN']
    };

    // Set Vercel environment flag
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';

    // This should fail with our formatted error message
    await updateVercelEnvVars(project);
  } catch (error) {
    // We expect the error to be thrown, but the formatted message should have been displayed
    console.log('Test completed: Error was thrown as expected');
  }
}

// Start execution
testErrorFormatting().catch((error) => {
  console.error('Unexpected error in test:', error.message);
});
