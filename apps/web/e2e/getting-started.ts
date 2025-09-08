#!/usr/bin/env ts-node

/**
 * Getting Started Script for Playwright E2E Tests
 *
 * This script helps you set up and run your first Playwright test
 * following the patterns from TESTING_STRATEGY.md
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
}

async function checkPrerequisites() {
    console.log(`${colors.blue}🔍 Checking prerequisites...${colors.reset}`)

    // Check if .env.test exists
    const envTestPath = path.join(__dirname, '../../.env.test')
    if (!fs.existsSync(envTestPath)) {
        console.log(`${colors.yellow}⚠️  .env.test not found. Please create it using:${colors.reset}`)
        console.log(`   cp e2e/env.example .env.test`)
        console.log(`   Then edit .env.test with your test credentials`)
        return false
    }

    // Check if dev server is running
    try {
        const { stdout } = await execAsync('lsof -ti :3000')
        if (stdout.trim()) {
            console.log(`${colors.green}✅ Development server is running on port 3000${colors.reset}`)
        }
    } catch (error) {
        console.log(`${colors.yellow}⚠️  Development server not detected on port 3000${colors.reset}`)
        console.log(`   Start it with: pnpm dev`)
    }

    return true
}

async function runFirstTest() {
    console.log(`${colors.blue}🚀 Running your first Playwright test...${colors.reset}`)

    try {
        // Run the auth test in headed mode for visibility
        const command = 'npx playwright test auth.spec.ts --headed --project=chromium'
        console.log(`${colors.bold}Executing: ${command}${colors.reset}`)

        const { stdout, stderr } = await execAsync(command, {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env }
        })

        console.log(stdout)
        if (stderr) {
            console.log(`${colors.yellow}Warnings:${colors.reset}`)
            console.log(stderr)
        }

        console.log(`${colors.green}✅ Test completed successfully!${colors.reset}`)
    } catch (error: any) {
        console.log(`${colors.red}❌ Test failed:${colors.reset}`)
        console.log(error.stdout || error.message)

        console.log(`${colors.yellow}💡 Troubleshooting tips:${colors.reset}`)
        console.log(`   1. Check your .env.test credentials`)
        console.log(`   2. Ensure your test user exists in Auth0`)
        console.log(`   3. Make sure the development server is running`)
        console.log(`   4. Run in debug mode: pnpm test:e2e:auth:debug`)
    }
}

async function showNextSteps() {
    console.log(`${colors.blue}📚 Next Steps:${colors.reset}`)
    console.log(`
   ${colors.bold}Learn More:${colors.reset}
   • Read the E2E testing guide: e2e/README.md
   • Check the testing strategy: ../../TESTING_STRATEGY.md
   
   ${colors.bold}Debug & Explore:${colors.reset}
   • Run in debug mode: pnpm test:e2e:auth:debug
   • View test report: pnpm test:e2e:report
   • Record new tests: npx playwright codegen localhost:3000
   
   ${colors.bold}Extend Testing:${colors.reset}
   • Add more test files in e2e/tests/
   • Create page objects for complex interactions
   • Set up CI/CD integration
   `)
}

async function main() {
    console.log(`${colors.bold}${colors.blue}
╔═══════════════════════════════════════════════════════════╗
║                Playwright E2E Testing                     ║
║                   Getting Started                         ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`)

    const prerequisitesOk = await checkPrerequisites()
    if (!prerequisitesOk) {
        console.log(`${colors.red}❌ Please fix the prerequisites above before continuing${colors.reset}`)
        process.exit(1)
    }

    await runFirstTest()
    await showNextSteps()
}

if (require.main === module) {
    main().catch(console.error)
}
