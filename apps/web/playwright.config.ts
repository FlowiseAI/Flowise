import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '.env.test') })

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',
    /* Output directories - keep everything organized in e2e folder */
    outputDir: './e2e/test-results',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html', { outputFolder: './e2e/playwright-report' }]],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Take screenshot only when test fails */
        screenshot: 'only-on-failure'
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Use prepared auth state if available
                storageState: './e2e/.auth/user.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                storageState: './e2e/.auth/user.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                storageState: './e2e/.auth/user.json'
            },
            dependencies: ['setup']
        }
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000 // 2 minutes for startup
    }
})
