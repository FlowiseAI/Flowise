import { test as setup, expect } from '@playwright/test'

const authFile = './e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
    // Validate environment variables - we'll use the admin user for setup by default
    const testEmail = process.env.TEST_USER_ENTERPRISE_ADMIN_EMAIL

    if (!testEmail || !process.env.TEST_USER_PASSWORD) {
        throw new Error('TEST_USER_ENTERPRISE_ADMIN_EMAIL and TEST_USER_PASSWORD must be set in .env.test file')
    }

    console.log('🔐 Starting authentication setup...')

    // Go to the homepage - this should redirect to Auth0 login if not authenticated
    await page.goto('/')

    // Wait for either Auth0 login page or already authenticated content
    try {
        // Check if we're already on an authenticated page
        await page.waitForSelector('body', { timeout: 5000 })
        const bodyText = await page.textContent('body')

        if (bodyText?.includes('Dashboard') || bodyText?.includes('Chat') || bodyText?.includes('Welcome')) {
            console.log('ℹ️  Already authenticated, skipping login')
            await page.context().storageState({ path: authFile })
            return
        }
    } catch (error) {
        // Continue with login process
    }

    console.log('🌐 Waiting for Auth0 login page...')

    // Wait for Auth0 login page to load - be flexible with selectors
    await page.waitForSelector(
        [
            'input[name="username"]',
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="username" i]'
        ].join(', '),
        { timeout: 15000 }
    )

    // Step 1: Fill email and continue
    console.log('📧 Filling email...')
    const emailInput = page
        .locator(
            [
                'input[name="username"]',
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email" i]',
                'input[placeholder*="username" i]'
            ].join(', ')
        )
        .first()
    await emailInput.fill(testEmail!)

    // Click Continue/Submit to proceed to password step
    console.log('⏭️  Proceeding to password step...')
    const continueButton = page
        .locator(
            [
                'button[type="submit"]',
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'button[data-action-button-primary="true"]'
            ].join(', ')
        )
        .first()
    await continueButton.click()

    // Step 2: Wait for password input page and fill password
    console.log('🔑 Waiting for password page and filling password...')
    await page.waitForSelector(['input[name="password"]', 'input[type="password"]', 'input[placeholder*="password" i]'].join(', '), {
        timeout: 10000
    })

    const passwordInput = page
        .locator(['input[name="password"]', 'input[type="password"]', 'input[placeholder*="password" i]'].join(', '))
        .first()
    await passwordInput.fill(process.env.TEST_USER_PASSWORD!)

    // Submit the login form
    console.log('🚀 Submitting login form...')
    const submitButton = page
        .locator(
            [
                'button[type="submit"][data-action-button-primary="true"]',
                'button[type="submit"]:not([data-provider])',
                'button[type="submit"]',
                'button:has-text("Log In")',
                'button:has-text("Sign In")',
                'button:has-text("Continue")',
                'input[type="submit"]'
            ].join(', ')
        )
        .first()
    await submitButton.click()

    // Step 3: Handle potential organization selection
    console.log('🏢 Checking for organization selection...')
    try {
        const preferredOrgId = process.env.TEST_ENTERPRISE_AUTH0_ORG_ID
        const preferredOrgName = process.env.TEST_ENTERPRISE_ORG_NAME || 'local'

        if (preferredOrgId) {
            console.log(`🎯 Looking for organization with ID: ${preferredOrgId}`)

            // Wait for organization selection forms to appear
            await page.waitForSelector('form', { timeout: 5000 })

            // Look for the form that contains a hidden input with the specific organization ID
            const targetForm = page.locator(`form:has(input[name="organization"][value="${preferredOrgId}"])`)

            if (await targetForm.isVisible({ timeout: 5000 })) {
                console.log(`🎯 Found form with organization ID: ${preferredOrgId}`)

                // Find the submit button within this specific form and click it
                const submitButton = targetForm.locator('button[type="submit"]')
                if (await submitButton.isVisible({ timeout: 2000 })) {
                    const buttonText = await submitButton.textContent()
                    console.log(`🎯 Clicking organization button: "${buttonText}" (ID: ${preferredOrgId})`)
                    await submitButton.click()
                } else {
                    console.log('🎯 Submit button not found in the target form')
                }
            } else {
                console.log(`🎯 Could not find form with organization ID: ${preferredOrgId}`)

                // Debug: Log all available organization IDs
                const allOrgInputs = page.locator('form input[name="organization"]')
                const orgCount = await allOrgInputs.count()
                console.log(`🎯 Found ${orgCount} organization forms. Available organization IDs:`)

                for (let i = 0; i < orgCount; i++) {
                    const orgInput = allOrgInputs.nth(i)
                    const orgIdValue = await orgInput.getAttribute('value')
                    const form = orgInput.locator('..')
                    const buttonText = await form
                        .locator('button span')
                        .textContent()
                        .catch(() => 'Unknown')
                    console.log(`   - ID: ${orgIdValue}, Name: "${buttonText}"`)
                }

                // Fallback to name-based selection
                console.log(`🎯 Falling back to name-based selection: ${preferredOrgName}`)
                const nameBasedButton = page.locator(`button:has-text("${preferredOrgName}")`)
                if (await nameBasedButton.isVisible({ timeout: 2000 })) {
                    await nameBasedButton.click()
                } else {
                    console.log(`🎯 Could not find organization with name: ${preferredOrgName}`)
                    // Select first available organization as last resort
                    const firstForm = page.locator('form').first()
                    const firstButton = firstForm.locator('button[type="submit"]')
                    if (await firstButton.isVisible({ timeout: 2000 })) {
                        const firstButtonText = await firstButton.textContent()
                        console.log(`🎯 Selecting first available organization: "${firstButtonText}"`)
                        await firstButton.click()
                    }
                }
            }
        } else {
            // Fallback to name-based selection
            console.log(`🎯 No organization ID provided, falling back to name-based selection: ${preferredOrgName}`)
            const orgSelector = page.locator(
                [
                    `button:has-text("${preferredOrgName}")`,
                    'button:has-text("local")',
                    'button:has-text("dev")',
                    'button:has-text("development")',
                    '[data-testid="organization-selector"]',
                    '.organization-item',
                    'form input[name="organization"]'
                ].join(', ')
            )

            if (await orgSelector.first().isVisible({ timeout: 5000 })) {
                console.log(`🎯 Organization selection detected, selecting: ${preferredOrgName}`)
                await orgSelector.first().click()
            }
        }
    } catch (error) {
        console.log('ℹ️  No organization selection step detected, proceeding')
    }

    // Wait for redirect back to the application after successful login
    console.log('⏳ Waiting for redirect back to application...')
    await page.waitForURL(/localhost:3000/, { timeout: 20000 })

    // Verify we're actually logged in by checking for user-specific content
    console.log('✅ Verifying successful authentication...')
    await expect(page.locator('body')).toContainText(['Dashboard', 'Welcome', 'Chat', 'Chatflows', 'Settings', 'Profile'], {
        timeout: 15000
    })

    // Ensure we're not on Auth0 anymore
    await expect(page).not.toHaveURL(/auth0\.com|\.auth0\.com/)

    // Save authentication state
    await page.context().storageState({ path: authFile })

    console.log('✅ Authentication setup completed successfully')
})
