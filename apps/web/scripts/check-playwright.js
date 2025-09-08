#!/usr/bin/env node

/**
 * Check if Playwright browsers are installed and ready
 * Provides helpful error messages if setup is needed
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function checkPlaywrightSetup() {
    try {
        // Check if Playwright is installed
        require.resolve('@playwright/test')

        // Try to actually launch a browser to verify it works
        try {
            // This will fail if browsers aren't properly installed
            const result = execSync('npx playwright install --dry-run', {
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 15000
            })

            // If dry-run output indicates browsers need installation
            if (
                result.toLowerCase().includes('downloading') ||
                result.toLowerCase().includes('installing') ||
                result.toLowerCase().includes('missing')
            ) {
                throw new Error('Browsers need installation')
            }

            console.log('✅ Playwright setup complete - browsers ready')
            return true
        } catch (browserCheckError) {
            // Always recommend the exact command Playwright suggests
            console.error('❌ Playwright browsers missing or outdated')
            console.error('📦 Please run: npx playwright install')
            console.error('   Or with system deps: npx playwright install --with-deps')
            console.error('')
            console.error('🔧 Alternative: pnpm test:e2e:setup')
            process.exit(1)
        }
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('❌ Playwright not installed')
            console.error('📦 Please run: pnpm install')
            console.error('   Then run: pnpm test:e2e:setup')
        } else {
            console.error('❌ Playwright setup check failed:', error.message)
            console.error('📦 Try running: pnpm test:e2e:setup')
        }
        process.exit(1)
    }
}

// Only run check if called directly (not required as module)
if (require.main === module) {
    checkPlaywrightSetup()
}

module.exports = { checkPlaywrightSetup }
