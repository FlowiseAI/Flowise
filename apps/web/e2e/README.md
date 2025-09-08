# E2E Testing with Playwright

This directory contains end-to-end tests for the TheAnswer.ai web application using Playwright, including comprehensive role-based authentication and menu permission testing.

## Quick Start

### 1. Install Playwright Browsers

**First time setup** (required):

```bash
# From project root
pnpm test:e2e:setup

# Or from apps/web directory
pnpm test:e2e:setup
```

This installs Playwright browsers and system dependencies. **You only need to run this once** (or after Playwright updates).

### 2. Automatic Browser Checks

All test scripts now **automatically check** if browsers are installed:

```bash
# These will check for browsers and show helpful error messages if not found
pnpm test:e2e:dev      # ✅ Auto-checks browsers before running
pnpm test:e2e:debug    # ✅ Auto-checks browsers before running
pnpm test:e2e:headed   # ✅ Auto-checks browsers before running
```

**If you see browser errors**, the scripts will tell you exactly what to run:

```
❌ Playwright browsers not found
📦 Please run: pnpm test:e2e:setup
```

### 3. Environment Variables

Create a `.env.test` file in the apps/web directory with your test credentials:

```bash
# From apps/web directory
cp e2e/env.example .env.test
```

Edit `.env.test` and fill in:

-   `TEST_USER_ENTERPRISE_ADMIN_EMAIL`: Email of your test Auth0 admin user
-   `TEST_USER_ENTERPRISE_BUILDER_EMAIL`: Email of your test Auth0 builder user
-   `TEST_USER_ENTERPRISE_MEMBER_EMAIL`: Email of your test Auth0 member user
-   `TEST_USER_PASSWORD`: Shared password for all test Auth0 users
-   `TEST_ENTERPRISE_AUTH0_ORG_ID`: Auth0 organization ID for precise organization selection (e.g., "org_unQ8OLmTNsxVTJCT")
-   `TEST_ENTERPRISE_ORG_NAME`: Organization display name for UI verification (e.g., "local")
-   Auth0 configuration (should match your development environment)

### 4. Test User Setup

You'll need **three test users** in your Auth0 tenant with different roles:

**Admin User** (`TEST_USER_ENTERPRISE_ADMIN_EMAIL`):

-   Has `org:manage` permission or Admin role
-   Can see: Sidekick Studio, Profile, Billing, Apps button
-   Can see: All studio sub-items, Upgrade Plan, Export/Import

**Builder User** (`TEST_USER_ENTERPRISE_BUILDER_EMAIL`):

-   Has `chatflow:manage` permission
-   Can see: Sidekick Studio, Profile, Apps button
-   Cannot see: Billing, Upgrade Plan, Export/Import

**Member User** (`TEST_USER_ENTERPRISE_MEMBER_EMAIL`):

-   Has `chatflow:use` permission only
-   Can see: Profile only
-   Cannot see: Studio, Billing, Apps button, Upgrade Plan

**Setup in Auth0:**

1. Go to your Auth0 Dashboard
2. Navigate to User Management > Users
3. Create three test users with the emails from your `.env.test`
4. Assign appropriate roles/permissions to each user
5. Ensure all users are in the same organization (with ID matching `TEST_ENTERPRISE_AUTH0_ORG_ID` and display name matching `TEST_ENTERPRISE_ORG_NAME`)

## Running Tests

### 🚀 Quick Commands

All commands include **automatic browser checks** and helpful error messages:

```bash
# Visual UI mode (recommended for development)
pnpm test:e2e:dev

# Step-by-step debugging with inspector
pnpm test:e2e:debug

# Browser visible mode (watch tests run)
pnpm test:e2e:headed

# Headless mode (CI-friendly)
pnpm test:e2e

# Only authentication tests (all user types)
pnpm test:e2e:auth

# Auth tests with browser visible
pnpm test:e2e:auth:headed

# Auth tests with debugging
pnpm test:e2e:auth:debug

# Show test report from last run
pnpm test:e2e:report
```

### 🔧 Setup Commands

```bash
# Install browsers (run once, or after Playwright updates)
pnpm test:e2e:setup

# Check if browsers are ready (optional - done automatically)
pnpm test:e2e:check
```

### 👥 Role-Based Testing (New!)

The tests now include comprehensive **role-based authentication testing**:

```bash
# Tests all three user types automatically
pnpm test:e2e:auth
```

**What's tested for each user:**

-   ✅ **Login flow** with organization selection
-   ✅ **Menu permissions** based on user role (Admin/Builder/Member)
-   ✅ **Navigation access** to appropriate sections
-   ✅ **Feature visibility** (Upgrade Plan, Export/Import, etc.)
-   ✅ **Apps button visibility** based on permissions

**Test output includes:**

-   🔐 Login verification for each user type
-   📧 Email and organization display validation
-   🎭 Menu expansion and sub-item checking
-   🚫 Permission restriction verification

### 🎨 Playwright UI Mode (Recommended)

The **Playwright UI** provides a visual interface with:

-   **Live test execution** with step-by-step screenshots
-   **Interactive test explorer** to run specific tests
-   **Time travel debugging** - click any step to see what happened
-   **Network tab** to inspect API calls
-   **Console logs** for each test step
-   **Test artifacts** (screenshots, videos, traces) in one place

```bash
# Open Playwright UI
pnpm test:e2e:dev
```

This opens a web interface where you can:

1. **Select tests** to run from the sidebar
2. **Watch tests execute** in real-time with screenshots
3. **Click any step** to see the page state at that moment
4. **Inspect failures** with detailed error information
5. **Re-run tests** with a single click

### Development Server

The tests are configured to automatically start the development server if it's not running. If you want to run the server manually:

```bash
# In one terminal
pnpm dev
# OR
pnpm start ## for faster tests

# In another terminal
pnpm test:e2e ## Runs in the background
# OR
pnpm test:e2e:headed
```

## Test Files

-   `auth.setup.ts` - Authentication setup that saves login state
-   `tests/auth.spec.ts` - Main authentication flow tests

## Test Structure

### Authentication Flow Tests

1. **Unauthenticated Redirect**: Verifies users are redirected to Auth0 login
2. **Successful Login**: Tests login with valid credentials
3. **Invalid Credentials**: Tests error handling for wrong credentials
4. **Authenticated Access**: Tests that logged-in users can access protected pages

### Test Strategy

The tests follow the authentication strategy from the testing guide:

1. Use `storageState` to persist authentication between tests
2. Test critical authentication flows without relying on hardcoded URLs
3. Verify both Auth0 integration and application behavior

### Organization Selection Implementation

The authentication tests include sophisticated organization selection logic for Auth0 enterprise setups:

**Primary Method (Recommended):**

-   Uses the `TEST_ENTERPRISE_AUTH0_ORG_ID` environment variable
-   Looks for form inputs with `value="${orgId}"` (e.g., `org_unQ8OLmTNsxVTJCT`)
-   More precise than text-based selection as it matches the exact Auth0 organization ID

**Fallback Methods:**

-   Searches for data attributes: `[data-org-id]`, `[data-organization-id]`
-   Looks for button values: `button[value="${orgId}"]`
-   Falls back to text-based selection if ID-based selection fails

**Example Organization Picker HTML:**

```html
<form method="post" class="c72ce1d20 cc34c940c">
    <input type="hidden" name="state" value="..." />
    <input type="hidden" name="organization" value="org_unQ8OLmTNsxVTJCT" />
    <button type="submit" class="...">
        <span>Local Dev</span>
    </button>
</form>
```

The test framework specifically targets the `input[value="org_unQ8OLmTNsxVTJCT"]` selector for precise organization selection.

## Debugging

### 🎨 UI Mode (Best for Development)

The Playwright UI is the easiest way to debug tests:

```bash
pnpm test:e2e:dev
```

**Features:**

-   **Visual timeline** - see every action with screenshots
-   **Click to debug** - click any step to pause and inspect
-   **Live DOM inspection** - hover over elements to highlight them
-   **Network monitoring** - see all API calls and responses
-   **Error analysis** - detailed failure information with context

### 🔍 Debug Mode (Step-by-Step)

For detailed step-through debugging:

```bash
pnpm test:e2e:auth:debug
```

This opens a browser and Playwright Inspector where you can:

-   **Step through** test actions one by one
-   **Inspect page elements** in real-time
-   **Execute commands** in the browser console
-   **Modify selectors** and test them live

### 📊 Test Artifacts

Tests automatically capture:

-   **Screenshots** (saved to `e2e/test-results/`)
-   **Videos** of test execution
-   **Traces** with detailed timeline (view with `npx playwright show-trace`)
-   **Network logs** for API debugging

### Common Issues

1. **Auth0 selectors**: If tests fail finding login elements, check the Auth0 page HTML and update selectors in the test files

2. **Timing issues**: If tests are flaky, increase timeouts:

    ```typescript
    await page.waitForSelector('selector', { timeout: 10000 })
    ```

3. **Environment variables**: Ensure `.env.test` is properly configured and the test user exists in Auth0

4. **Development server**: Make sure the Next.js app starts correctly and Auth0 is properly configured

## Extending Tests

### Adding New Tests

1. Create new test files in `e2e/tests/`
2. Follow the pattern in `auth.spec.ts`
3. Use the authentication state from `auth.setup.ts`

### Page Object Pattern

For complex tests, consider creating page objects:

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
    constructor(private page: Page) {}

    async login(email: string, password: string) {
        await this.page.fill('[name="username"]', email)
        await this.page.fill('[name="password"]', password)
        await this.page.click('button[type="submit"]')
    }
}
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e
  env:
      TEST_USER_ENTERPRISE_ADMIN_EMAIL: ${{ secrets.TEST_USER_ENTERPRISE_ADMIN_EMAIL }}
      TEST_USER_ENTERPRISE_BUILDER_EMAIL: ${{ secrets.TEST_USER_ENTERPRISE_BUILDER_EMAIL }}
      TEST_USER_ENTERPRISE_MEMBER_EMAIL: ${{ secrets.TEST_USER_ENTERPRISE_MEMBER_EMAIL }}
      TEST_ENTERPRISE_AUTH0_ORG_ID: ${{ secrets.TEST_ENTERPRISE_AUTH0_ORG_ID }}
      TEST_ENTERPRISE_ORG_NAME: ${{ secrets.TEST_ENTERPRISE_ORG_NAME }}
      TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## Resources

-   [Playwright Documentation](https://playwright.dev/)
-   [Auth0 Testing Guide](https://auth0.com/docs/test)
-   [Testing Strategy Document](../../../TESTING_STRATEGY.md)
