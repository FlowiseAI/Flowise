# Automated Testing Strategy for TheAnswer.ai Platform

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Critical User Journeys](#critical-user-journeys)
3. [Auth0 Testing Strategy](#auth0-testing-strategy)
4. [Test Data Management](#test-data-management)
5. [Billing & Credits Testing](#billing--credits-testing)
6. [Permissions Testing](#permissions-testing)
7. [API Contract Testing](#api-contract-testing)
8. [Example Test Implementations](#example-test-implementations)
9. [CI/CD Strategy](#cicd-strategy)
10. [Getting Started Exercise](#getting-started-exercise)

---

## Testing Philosophy

### Layered Testing Approach

Our testing strategy follows the **testing pyramid** with three main layers:

```
    /\
   /  \    E2E Tests (Few, Critical Paths)
  /____\
 /      \   Integration/API Tests (More, Fast)
/__________\ Unit Tests (Many, Instant)
```

**Unit Tests (70%)**

-   Fast, isolated tests for business logic
-   Focus on: billing calculations, permission checks, data transformations
-   Run in milliseconds, no external dependencies

**API/Integration Tests (25%)**

-   Test API contracts and data flow
-   Focus on: authentication, authorization, billing endpoints
-   Use real database (test schema), mock external services

**E2E Tests (5%)**

-   Critical user journeys only
-   Focus on: login flow, billing limits, permission blocks
-   Use Playwright with real browser automation

### Key Testing Principles

1. **Fast Feedback**: Unit tests should run in <10 seconds
2. **Reliable**: Tests shouldn't be flaky or dependent on external services
3. **Maintainable**: Clear naming, good structure, easy to debug
4. **Realistic**: Test with data that mirrors production scenarios

---

## Critical User Journeys

These are the **must-test** scenarios that, if broken, would severely impact the business:

### 1. **New User Onboarding** (High Priority)

```
User clicks "Sign Up" → Auth0 → Account creation → Free tier credits assigned → Dashboard with empty state
```

### 2. **AI Credit Consumption** (High Priority)

```
User makes AI request → Credits deducted correctly → Usage dashboard updates → Billing tracked in Stripe
```

### 3. **Billing Threshold Enforcement** (Critical)

```
User approaches limit → Warning shown → Hard limit reached → Requests blocked → Upgrade prompt
```

### 4. **Permission Enforcement** (High Priority)

```
Regular user tries admin action → Access denied → Admin performs same action → Success
```

### 5. **Organization Management** (Medium Priority)

```
Admin invites user → User accepts → Proper org scope → Resource visibility correct
```

---

## Auth0 Testing Strategy

### Using storageState for Authentication

Instead of hardcoding redirect URLs, use Playwright's `storageState` to persist authentication:

```typescript
// tests/setup/auth-setup.ts
import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/admin.json'

setup('authenticate', async ({ page }) => {
    // Go to login page
    await page.goto('/login')

    // Use Admin user as default for general testing
    await page.fill('[data-testid="email"]', process.env.TEST_USER_ADMIN_EMAIL!)
    await page.fill('[data-testid="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('[data-testid="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
    await expect(page.getByText('Welcome')).toBeVisible()

    // Save authentication state
    await page.context().storageState({ path: authFile })
})
```

```typescript
// playwright.config.ts
export default defineConfig({
    // Other config...
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/
        },
        {
            name: 'authenticated',
            use: {
                storageState: 'playwright/.auth/admin.json' // Default to admin user
            },
            dependencies: ['setup']
        }
    ]
})
```

### Different User Roles

Create separate auth files for different roles:

```typescript
// tests/setup/admin-auth.setup.ts
setup('admin-auth', async ({ page }) => {
    await authenticateAs({
        page,
        email: process.env.ADMIN_USER_EMAIL!,
        password: process.env.ADMIN_USER_PASSWORD!,
        authFile: 'playwright/.auth/admin.json'
    })
})

// tests/setup/regular-user-auth.setup.ts
setup('regular-user-auth', async ({ page }) => {
    await authenticateAs({
        page,
        email: process.env.REGULAR_USER_EMAIL!,
        password: process.env.REGULAR_USER_PASSWORD!,
        authFile: 'playwright/.auth/regular-user.json'
    })
})
```

---

## Test Data Management

### Current Implementation: Simple Environment-Based Users

**Philosophy**: Use a straightforward approach with pre-configured test users in Auth0 and environment variables for credentials. This is simple, maintainable, and works well for most testing scenarios.

### Pre-Configured Test Users

Based on the actual implementation in `apps/web/e2e/env.example`, we use three main test users:

```typescript
// Test users are configured via environment variables in .env.test:

// Enterprise test users with different permission levels
TEST_USER_ENTERPRISE_ADMIN_EMAIL=alpha+enterprise-admin@domain.ai
TEST_USER_ENTERPRISE_BUILDER_EMAIL=alpha+enterprise-builder@domain.ai
TEST_USER_ENTERPRISE_MEMBER_EMAIL=alpha+enterprise-member@domain.ai

// Shared password for all test users
TEST_USER_PASSWORD=your-secure-test-password

// Organization configuration
TEST_ENTERPRISE_AUTH0_ORG_ID=org_unQ8OLmTNsxVTJCT
TEST_ENTERPRISE_ORG_NAME=Local Dev
```

### Test User Roles and Permissions

**Admin User** (`TEST_USER_ENTERPRISE_ADMIN_EMAIL`):

-   Has `org:manage` permission or Admin role in Auth0
-   **Can see**: Sidekick Studio, Profile, Billing, Apps button
-   **Studio access**: All studio sub-items (Sidekick Store, Chatflows, Agentflows, etc.)
-   **Special features**: Upgrade Plan, Export/Import functionality
-   **Use case**: Testing admin-only features, billing management, organization settings

**Builder User** (`TEST_USER_ENTERPRISE_BUILDER_EMAIL`):

-   Has `chatflow:manage` permission in Auth0
-   **Can see**: Sidekick Studio, Profile, Apps button
-   **Studio access**: All studio sub-items for building and managing chatflows
-   **Cannot see**: Billing, Upgrade Plan, Export/Import
-   **Use case**: Testing content creation workflows, chatflow management

**Member User** (`TEST_USER_ENTERPRISE_MEMBER_EMAIL`):

-   Has `chatflow:use` permission only in Auth0
-   **Can see**: Profile only
-   **Cannot see**: Studio sections, Billing, Apps button, Upgrade Plan
-   **Use case**: Testing restricted access, basic user experience

````

### Current Authentication Implementation

The current implementation uses a simple, single auth setup that works with all test users:

```typescript
// apps/web/e2e/auth.setup.ts - Actual implementation
import { test as setup, expect } from '@playwright/test'

const authFile = './e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
    // Uses admin user for initial auth setup by default
    const testEmail = process.env.TEST_USER_ENTERPRISE_ADMIN_EMAIL

    if (!testEmail || !process.env.TEST_USER_PASSWORD) {
        throw new Error('TEST_USER_ENTERPRISE_ADMIN_EMAIL and TEST_USER_PASSWORD must be set in .env.test file')
    }

    // Go to homepage - redirects to Auth0 if not authenticated
    await page.goto('/')

    // Handle Auth0 two-step login process
    // Step 1: Email input
    await page.waitForSelector('input[name="username"], input[type="email"]')
    const emailInput = page.locator('input[name="username"], input[type="email"]').first()
    await emailInput.fill(testEmail)

    // Continue to password step
    const continueButton = page.locator('button[type="submit"]').first()
    await continueButton.click()

    // Step 2: Password input
    await page.waitForSelector('input[name="password"]')
    const passwordInput = page.locator('input[name="password"]').first()
    await passwordInput.fill(process.env.TEST_USER_PASSWORD!)

    // Submit login
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    // Step 3: Organization selection (if applicable)
    const preferredOrgId = process.env.TEST_ENTERPRISE_AUTH0_ORG_ID
    if (preferredOrgId) {
        const targetForm = page.locator(`form:has(input[name="organization"][value="${preferredOrgId}"])`)
        if (await targetForm.isVisible({ timeout: 5000 })) {
            await targetForm.locator('button[type="submit"]').click()
        }
    }

    // Wait for redirect and verify login
    await page.waitForURL(/localhost:3000/, { timeout: 20000 })
    await expect(page.locator('body')).toContainText(['Dashboard', 'Welcome', 'Chat'])

    // Save authentication state for reuse
    await page.context().storageState({ path: authFile })
})
````

### Using Test Users in Tests

The current implementation in `apps/web/e2e/tests/auth.spec.ts` shows role-based testing:

```typescript
// Role-based authentication and permissions testing
test.describe('User Role-Based Authentication and Permissions', () => {
    // Test data for different user types
    const testUsers = {
        admin: {
            email: process.env.TEST_USER_ENTERPRISE_ADMIN_EMAIL!,
            password: process.env.TEST_USER_PASSWORD!,
            role: 'admin',
            expectedMenuItems: {
                topLevel: ['Sidekick Studio', 'Profile', 'Billing'],
                studio: ['Sidekick Store', 'Chatflows', 'Agentflows', 'Assistants', 'Document Stores'],
                upgradeVisible: true,
                exportImportVisible: true
            }
        },
        builder: {
            email: process.env.TEST_USER_ENTERPRISE_BUILDER_EMAIL!,
            password: process.env.TEST_USER_PASSWORD!,
            role: 'builder',
            expectedMenuItems: {
                topLevel: ['Sidekick Studio', 'Profile'],
                studio: ['Sidekick Store', 'Chatflows', 'Agentflows', 'Assistants'],
                upgradeVisible: false,
                exportImportVisible: false
            }
        },
        member: {
            email: process.env.TEST_USER_ENTERPRISE_MEMBER_EMAIL!,
            password: process.env.TEST_USER_PASSWORD!,
            role: 'member',
            expectedMenuItems: {
                topLevel: ['Profile'],
                studio: [], // Members don't see Studio
                upgradeVisible: false,
                exportImportVisible: false
            }
        }
    }

    // Test each user type automatically
    for (const [userType, userData] of Object.entries(testUsers)) {
        test(`should login as ${userType} and show correct permissions`, async ({ page }) => {
            // Clear auth state and login as specific user
            await page.context().clearCookies()
            await loginAsUser(page, userData.email, userData.password, process.env.TEST_ENTERPRISE_AUTH0_ORG_ID)

            // Verify menu permissions based on role
            for (const menuItem of userData.expectedMenuItems.topLevel) {
                await expect(page.getByText(menuItem)).toBeVisible()
            }

            // Test studio access for admins and builders
            if (userData.expectedMenuItems.studio.length > 0) {
                await page.getByText('Sidekick Studio').click()
                for (const studioItem of userData.expectedMenuItems.studio) {
                    await expect(page.getByText(studioItem)).toBeVisible()
                }
            }
        })
    }
})
```

### Key Testing Patterns

**1. Per-Test Authentication:**

```typescript
// Each test logs in as needed user
async function loginAsUser(page, email, password, orgId) {
    await page.context().clearCookies()
    await page.goto('/')
    // Handle Auth0 login flow with organization selection
    // ... (see auth.spec.ts for full implementation)
}
```

**2. Permission Verification:**

```typescript
// Check what user can/cannot see based on role
if (userData.role === 'admin') {
    await expect(page.getByText('Billing')).toBeVisible()
} else {
    await expect(page.getByText('Billing')).not.toBeVisible()
}
```

**3. Navigation Testing:**

```typescript
// Verify user can access allowed sections
if (userData.role === 'builder') {
    await page.goto('/sidekick-studio/chatflows')
    await expect(page).not.toHaveURL(/auth0\.com/) // Should not redirect to login
}
```

### Test Setup Requirements

**Environment Setup:**

1. **Create test users in Auth0** with appropriate roles and permissions
2. **Configure `.env.test` file** with test user credentials (never commit this file)
3. **Set organization membership** for all test users in the same Auth0 organization
4. **Run initial auth setup** to generate authentication state for tests

**Simple Test User Management:**

```typescript
// Current approach: Use environment variables and Auth0 user management
// No complex factories or state management needed

// Test users are manually created in Auth0 with:
// - Different permission levels (admin, builder, member)
// - Same organization membership
// - Shared password for simplicity
// - Email format: alpha+{role}@domain.ai
```

**Benefits of Current Approach:**

-   ✅ **Simple setup**: Just create users in Auth0 and set environment variables
-   ✅ **Realistic testing**: Uses actual Auth0 authentication flows
-   ✅ **Easy maintenance**: No complex state management or factories to maintain
-   ✅ **Fast execution**: Direct login without state reset overhead
-   ✅ **Clear permissions**: Each user has distinct, well-defined roles

### Environment-Aware Test Data

```typescript
// tests/config/environmentConfig.ts
export const getTestConfig = () => {
    const environment = process.env.TEST_ENVIRONMENT || 'development'

    return {
        baseURL: {
            development: 'http://localhost:3000',
            staging: 'https://staging.theanswerai.com',
            production: 'https://app.theanswerai.com'
        }[environment],

        // Use different user sets per environment
        userSuffix: {
            development: '@theanswerai-test.com',
            staging: '@staging-test.theanswerai.com',
            production: '@prod-test.theanswerai.com'
        }[environment],

        // Adjust test behavior per environment
        skipExternalAPIs: environment === 'development',
        useRealBilling: environment === 'production'
    }
}
```

---

## Billing & Credits Testing

### Problem: Testing Without Spending Money

We need to test billing logic without making real AI API calls or charging real money.

### Solution: AI Client Abstraction

```typescript
// packages/server/src/services/ai/AiClientInterface.ts
export interface AiClient {
    generate(prompt: string, options?: AiOptions): Promise<AiResponse>
    getTokenCount(text: string): number
    getCreditCost(tokens: number): number
}

export interface AiResponse {
    content: string
    tokens: number
    credits: number
}
```

```typescript
// packages/server/src/services/ai/OpenAiClient.ts (Production)
export class OpenAiClient implements AiClient {
    async generate(prompt: string, options?: AiOptions): Promise<AiResponse> {
        const response = await this.openai.completions.create({
            model: options?.model || 'gpt-4',
            prompt,
            max_tokens: options?.maxTokens
        })

        const tokens = response.usage?.total_tokens || 0
        const credits = this.getCreditCost(tokens)

        // Track real usage in billing system
        await this.billingService.trackUsage('ai_tokens', credits)

        return {
            content: response.choices[0].text,
            tokens,
            credits
        }
    }

    getCreditCost(tokens: number): number {
        return Math.ceil(tokens / 10) // 10 tokens = 1 credit
    }
}
```

```typescript
// packages/server/src/services/ai/FakeAiClient.ts (Test)
export class FakeAiClient implements AiClient {
    private responses: Map<string, AiResponse> = new Map()

    // Pre-configure responses for testing
    mockResponse(prompt: string, response: AiResponse) {
        this.responses.set(prompt, response)
    }

    async generate(prompt: string): Promise<AiResponse> {
        // Return canned response
        const cannedResponse = this.responses.get(prompt) || {
            content: 'Test AI response',
            tokens: 100,
            credits: 10
        }

        // Still track usage in test billing system
        await this.billingService.trackUsage('ai_tokens', cannedResponse.credits)

        return cannedResponse
    }

    getCreditCost(tokens: number): number {
        return Math.ceil(tokens / 10)
    }
}
```

### Dependency Injection

```typescript
// packages/server/src/services/ServiceContainer.ts
export class ServiceContainer {
    static getAiClient(): AiClient {
        if (process.env.NODE_ENV === 'test') {
            return new FakeAiClient()
        }
        return new OpenAiClient()
    }
}
```

### Test Examples

```typescript
// tests/billing/credit-consumption.test.ts
describe('Credit Consumption', () => {
    let fakeAiClient: FakeAiClient
    let testUser: any

    beforeEach(async () => {
        fakeAiClient = ServiceContainer.getAiClient() as FakeAiClient
        testUser = await TestDataFactory.createUserWithCredits({
            credits: 1800
        })
    })

    test('should deduct credits correctly for AI usage', async () => {
        // Configure fake AI response
        fakeAiClient.mockResponse('Hello world', {
            content: 'Hello! How can I help?',
            tokens: 150, // Will cost 15 credits
            credits: 15
        })

        // Make AI request
        const response = await request
            .post('/api/v1/chatflows/predict')
            .set('Authorization', `Bearer ${testUser.apiKey}`)
            .send({
                chatflowId: testUser.defaultChatflowId,
                question: 'Hello world'
            })
            .expect(200)

        // Verify response
        expect(response.body.text).toBe('Hello! How can I help?')

        // Verify credits deducted
        const updatedUser = await getUserCredits(testUser.id)
        expect(updatedUser.credits).toBe(1785) // 1800 - 15
    })

    test('should block requests when credits exhausted', async () => {
        // Set user to very low credits
        await TestDataFactory.setUserCredits(testUser.id, 5)

        // Configure expensive AI response
        fakeAiClient.mockResponse('Complex question', {
            content: 'Complex answer...',
            tokens: 100,
            credits: 10 // More than user has
        })

        // Request should be blocked
        await request
            .post('/api/v1/chatflows/predict')
            .set('Authorization', `Bearer ${testUser.apiKey}`)
            .send({
                chatflowId: testUser.defaultChatflowId,
                question: 'Complex question'
            })
            .expect(403)
            .expect((res) => {
                expect(res.body.error).toContain('insufficient credits')
            })
    })
})
```

---

## Permissions Testing

### Unit Tests for Permission Matrix

```typescript
// tests/unit/permissions.test.ts
import { enforceAbility } from '../src/middlewares/authentication/enforceAbility'

describe('Permission Matrix', () => {
    const testCases = [
        // [role, resource, action, hasAccess]
        ['admin', 'Chatflow', 'read', true],
        ['admin', 'Chatflow', 'write', true],
        ['admin', 'Chatflow', 'delete', true],
        ['user', 'Chatflow', 'read', true], // Own resources
        ['user', 'Chatflow', 'write', true], // Own resources
        ['user', 'Chatflow', 'delete', false], // Cannot delete
        ['user', 'Organization', 'read', false],
        ['user', 'Organization', 'write', false]
    ]

    testCases.forEach(([role, resource, action, expected]) => {
        test(`${role} ${action} ${resource} should be ${expected}`, async () => {
            const mockReq = createMockRequest({ role, resource, action })
            const mockRes = createMockResponse()
            const mockNext = jest.fn()

            await enforceAbility(resource)(mockReq, mockRes, mockNext)

            if (expected) {
                expect(mockNext).toHaveBeenCalled()
            } else {
                expect(mockRes.status).toHaveBeenCalledWith(403)
            }
        })
    })
})
```

### Minimal E2E Permission Tests

Only test the most critical permission scenarios in E2E:

```typescript
// tests/e2e/permissions.spec.ts
test.describe('Critical Permissions', () => {
    test('regular user cannot access admin settings', async ({ page }) => {
        // Use regular user auth
        await page.goto('/admin/organizations')

        // Should see 403 or redirect to unauthorized page
        await expect(page.getByText('Access Denied')).toBeVisible()
    })

    test('admin can manage organization', async ({ page }) => {
        // Use admin auth
        await page.goto('/admin/organizations')

        // Should see admin interface
        await expect(page.getByText('Organization Management')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible()
    })
})
```

---

## API Contract Testing

Use Playwright's `request` context for fast API testing:

```typescript
// tests/api/chatflows.api.test.ts
import { test, expect } from '@playwright/test'

test.describe('Chatflows API', () => {
    let apiContext: any
    let testUser: any

    test.beforeAll(async ({ playwright }) => {
        // Create API context
        apiContext = await playwright.request.newContext({
            baseURL: process.env.API_URL || 'http://localhost:3000'
        })

        // Create test user
        testUser = await TestDataFactory.createUserWithCredits({
            credits: 1000
        })
    })

    test('GET /api/v1/chatflows returns user chatflows', async () => {
        const response = await apiContext.get('/api/v1/chatflows', {
            headers: {
                Authorization: `Bearer ${testUser.apiKey}`
            }
        })

        expect(response.status()).toBe(200)

        const chatflows = await response.json()
        expect(Array.isArray(chatflows)).toBe(true)
        expect(chatflows.every((cf) => cf.userId === testUser.id)).toBe(true)
    })

    test('POST /api/v1/chatflows creates new chatflow', async () => {
        const newChatflow = {
            name: 'Test Chatflow',
            flowData: '{"nodes":[],"edges":[]}',
            visibility: 'private'
        }

        const response = await apiContext.post('/api/v1/chatflows', {
            data: newChatflow,
            headers: {
                Authorization: `Bearer ${testUser.apiKey}`
            }
        })

        expect(response.status()).toBe(201)

        const created = await response.json()
        expect(created.name).toBe(newChatflow.name)
        expect(created.userId).toBe(testUser.id)
        expect(created.organizationId).toBe(testUser.organizationId)
    })

    test('unauthorized request returns 401', async () => {
        const response = await apiContext.get('/api/v1/chatflows')
        expect(response.status()).toBe(401)
    })
})
```

---

## Example Test Implementations

### 1. New User Empty State

```typescript
// tests/e2e/new-user-onboarding.spec.ts
import { test, expect } from '@playwright/test'

test.describe('New User Onboarding', () => {
    test('shows empty state for brand new user', async ({ page }) => {
        // Create fresh user with no chatflows
        const newUser = await TestDataFactory.createUserWithCredits({
            email: `newuser-${Date.now()}@test.com`,
            credits: 10000
        })

        // Login as new user (you'd implement auth flow here)
        await authenticateAs(page, newUser.email)

        // Should land on dashboard
        await page.goto('/dashboard')

        // Verify empty state elements
        await expect(page.getByText('Welcome to TheAnswer.ai')).toBeVisible()
        await expect(page.getByText('Create your first chatflow')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible()

        // Verify credits display
        await expect(page.getByText('10,000 credits remaining')).toBeVisible()

        // Click get started
        await page.getByRole('button', { name: 'Get Started' }).click()

        // Should navigate to chatflow builder
        await expect(page).toHaveURL('/canvas')
        await expect(page.getByText('Drag and drop nodes')).toBeVisible()
    })
})
```

### 2. Credit Consumption Flow

```typescript
// tests/e2e/credit-consumption.spec.ts
test.describe('Credit Consumption', () => {
    test('user consuming credits shows correct updates', async ({ page }) => {
        // Setup user with specific credit amount
        const user = await TestDataFactory.createUserWithCredits({
            credits: 1800
        })

        await authenticateAs(page, user.email)
        await page.goto('/dashboard')

        // Initial state
        await expect(page.getByText('1,800 credits remaining')).toBeVisible()

        // Configure fake AI to use 300 credits
        await configureFakeAiResponse('test question', {
            content: 'Test response',
            tokens: 3000,
            credits: 300
        })

        // Make AI request
        await page.goto(`/chat/${user.defaultChatflowId}`)
        await page.fill('[data-testid="chat-input"]', 'test question')
        await page.press('[data-testid="chat-input"]', 'Enter')

        // Wait for response
        await expect(page.getByText('Test response')).toBeVisible()

        // Navigate back to dashboard
        await page.goto('/dashboard')

        // Verify credits updated
        await expect(page.getByText('1,500 credits remaining')).toBeVisible()

        // Verify usage dashboard shows the consumption
        await page.click('[data-testid="usage-tab"]')
        await expect(page.getByText('300 credits used')).toBeVisible()
    })
})
```

### 3. Permission Block

```typescript
// tests/e2e/permissions-block.spec.ts
test.describe('Permission Enforcement', () => {
    test.use({ storageState: 'playwright/.auth/regular-user.json' })

    test('regular user blocked from admin actions', async ({ page }) => {
        // Try to access admin page
        await page.goto('/admin/organizations')

        // Should see access denied
        await expect(page.getByText('Access Denied')).toBeVisible()
        await expect(page.getByText('You do not have permission')).toBeVisible()

        // Try direct API call
        const response = await page.request.get('/api/v1/admin/organizations')
        expect(response.status()).toBe(403)
    })

    test('user can only see own chatflows', async ({ page, request }) => {
        // Create chatflow for different user
        const otherUser = await TestDataFactory.createUserWithCredits({
            email: 'other@test.com'
        })

        const otherChatflow = await request.post('/api/v1/chatflows', {
            data: {
                name: 'Other User Chatflow',
                flowData: '{}',
                userId: otherUser.id
            }
        })

        // Go to chatflows page
        await page.goto('/chatflows')

        // Should not see other user's chatflow
        await expect(page.getByText('Other User Chatflow')).not.toBeVisible()

        // Try to access other user's chatflow directly
        await page.goto(`/canvas/${otherChatflow.id}`)
        await expect(page.getByText('Not Found')).toBeVisible()
    })
})
```

---

## CI/CD Strategy

### PR Pipeline (Fast & Essential)

```yaml
# .github/workflows/pr.yml
name: PR Tests
on: [pull_request]

jobs:
    unit-tests:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '20'
                  cache: 'pnpm'

            - run: pnpm install
            - run: pnpm test:unit
            # Fast: <2 minutes

    api-tests:
        runs-on: ubuntu-latest
        services:
            postgres:
                image: postgres:15
                env:
                    POSTGRES_PASSWORD: test
                options: >-
                    --health-cmd pg_isready
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

        steps:
            - uses: actions/checkout@v4
            - run: pnpm install
            - run: pnpm db:migrate:test
            - run: pnpm test:api
            # Medium: <5 minutes

    smoke-e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - run: pnpm install
            - run: pnpm build
            - run: pnpm playwright install
            - run: pnpm test:e2e:smoke
            # Critical paths only: <3 minutes
```

### Nightly Pipeline (Comprehensive)

```yaml
# .github/workflows/nightly.yml
name: Nightly Full Test Suite
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  full-e2e-suite:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - run: pnpm playwright install
      - run: pnpm test:e2e:full
      # All E2E tests: <15 minutes

  api-canary-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:api:canary
      # Optional: Test against real APIs with test accounts
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}
        STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
```

### Test Categories

```json
// package.json scripts
{
    "test:unit": "jest --testPathPattern=unit",
    "test:api": "jest --testPathPattern=api",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:e2e:full": "playwright test",
    "test:e2e:auth": "playwright test --grep @auth",
    "test:e2e:billing": "playwright test --grep @billing"
}
```

```typescript
// Mark critical tests
test('new user onboarding @smoke @auth', async ({ page }) => {
    // Critical path test
})

test('credit consumption @smoke @billing', async ({ page }) => {
    // Critical billing test
})

test('admin dashboard layout @full', async ({ page }) => {
    // Comprehensive but not critical
})
```

---

## Getting Started Exercise

### Step 1: Record Your First Test

**Goal**: Build confidence with Playwright by recording a simple flow.

```bash
# 1. Start your local development server
pnpm dev

# 2. Record a test by interacting with the UI
npx playwright codegen http://localhost:3000

# This opens a browser where you can:
# - Click around the UI
# - Playwright generates test code automatically
# - Copy the generated code when done
```

### Step 2: Improve the Generated Test

Playwright generates brittle selectors. Let's fix them:

**Generated (Bad):**

```typescript
await page.click('text=Login')
await page.fill('input[type="email"]', 'test@example.com')
await page.click('button >> nth=2')
```

**Improved (Good):**

```typescript
await page.getByRole('button', { name: 'Login' }).click()
await page.getByLabel('Email address').fill('test@example.com')
await page.getByRole('button', { name: 'Sign In' }).click()
```

### Step 3: Add Meaningful Assertions

**Generated (Weak):**

```typescript
await page.waitForSelector('text=Dashboard')
```

**Improved (Strong):**

```typescript
// Wait for navigation and verify we're on the right page
await expect(page).toHaveURL('/dashboard')

// Verify key elements are present
await expect(page.getByText('Welcome back')).toBeVisible()
await expect(page.getByText(/\d+,?\d* credits remaining/)).toBeVisible()

// Verify user can interact with main features
await expect(page.getByRole('button', { name: 'Create Chatflow' })).toBeEnabled()
```

### Step 4: Your First Complete Test

Create `tests/getting-started.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Getting Started Exercise', () => {
    test('basic login and dashboard navigation', async ({ page }) => {
        // 1. Navigate to login
        await page.goto('/login')

        // 2. Verify login page loaded
        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()

        // 3. Fill login form (using admin user for general testing)
        await page.getByLabel('Email').fill(process.env.TEST_USER_ADMIN_EMAIL!)
        await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!)

        // 4. Submit and wait for redirect
        await page.getByRole('button', { name: 'Sign In' }).click()
        await expect(page).toHaveURL('/dashboard')

        // 5. Verify dashboard elements
        await expect(page.getByText('Dashboard')).toBeVisible()
        await expect(page.getByText(/credits remaining/)).toBeVisible()

        // 6. Navigate to chatflows
        await page.getByRole('link', { name: 'Chatflows' }).click()
        await expect(page).toHaveURL('/chatflows')

        // 7. Verify chatflows page
        await expect(page.getByRole('heading', { name: 'Chatflows' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Create New' })).toBeVisible()
    })
})
```

### Step 5: Run Your Test

```bash
# Run with Playwright UI (recommended - visual interface)
npx playwright test getting-started.spec.ts --ui

# Run in headed mode to see what happens
npx playwright test getting-started.spec.ts --headed

# Run in debug mode to step through
npx playwright test getting-started.spec.ts --debug

# Generate test report
npx playwright test getting-started.spec.ts --reporter=html
npx playwright show-report
```

**Playwright UI Mode:** The `--ui` flag opens a visual interface where you can:

-   See live test execution with screenshots
-   Click any step to pause and inspect
-   View network requests and console logs
-   Re-run tests with a single click
-   Debug failures with detailed context

### Step 6: Set Up CI

Add to your `package.json`:

```json
{
    "scripts": {
        "test:e2e": "playwright test --ui",
        "test:e2e:dev": "playwright test --ui",
        "test:e2e:debug": "playwright test --debug",
        "test:e2e:getting-started": "playwright test getting-started.spec.ts"
    }
}
```

Create `.github/workflows/getting-started.yml`:

```yaml
name: Getting Started Test
on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '20'
                  cache: 'pnpm'

            - run: pnpm install
            - run: pnpm playwright install
            - run: pnpm test:e2e:getting-started
              env:
                  TEST_USER_ADMIN_EMAIL: ${{ secrets.TEST_USER_ADMIN_EMAIL }}
                  TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

### What You've Learned

✅ **Recording tests**: Use `playwright codegen` to get started quickly  
✅ **Good selectors**: Prefer `getByRole`, `getByLabel` over brittle CSS selectors  
✅ **Strong assertions**: Test behavior, not just presence  
✅ **Local testing**: Debug with `--headed` and `--debug`  
✅ **CI integration**: Run tests automatically on every push

### Next Steps

1. **Add more assertions** to your test
2. **Create a second test** for a different user flow
3. **Practice test data setup** using the factory patterns
4. **Try API testing** with Playwright's request context
5. **Join the team** in building out the full test suite!

---

## TheAnswer.ai Playwright Implementation

### Current Setup

The TheAnswer.ai project now has a complete Playwright testing setup with the following features:

#### 📁 **Organized Structure**

```
apps/web/
├── e2e/
│   ├── .auth/               # Authentication state storage
│   ├── .gitignore          # E2E-specific gitignore
│   ├── tests/              # Test files
│   │   └── auth.spec.ts    # Authentication flow tests
│   ├── auth.setup.ts       # Auth setup with state persistence
│   ├── playwright-report/  # Test reports (auto-generated)
│   ├── test-results/       # Screenshots, videos, traces
│   ├── README.md           # E2E testing guide
│   └── env.example         # Environment template
├── playwright.config.ts    # Playwright configuration
├── .env.test              # Test environment variables
└── package.json           # Test scripts
```

#### 🚀 **Available Commands**

**Root Level (from project root):**

```bash
pnpm test:e2e      # Run tests with Playwright UI
pnpm test:e2e:dev  # Same as above (explicit)
pnpm test:e2e:debug # Debug mode with inspector
```

**Web App Level (from apps/web):**

```bash
pnpm test:e2e:dev      # Playwright UI mode
pnpm test:e2e          # Headless run
pnpm test:e2e:headed   # Browser visible
pnpm test:e2e:debug    # Step-by-step debugging
pnpm test:e2e:auth     # Only auth tests
pnpm test:e2e:report   # View last test report
```

#### 🎨 **Playwright UI Features**

The `--ui` mode provides:

-   **Visual test execution** with real-time screenshots
-   **Interactive debugging** - click any step to inspect
-   **Network monitoring** - see all API calls and responses
-   **Console logs** for each action
-   **Time travel** - navigate through test timeline
-   **Live element inspection** - hover to highlight DOM elements
-   **Test filtering** - run specific tests or suites

#### 🔐 **Authentication Strategy**

-   **Auth0 Integration**: Robust selectors that work with Auth0's dynamic UI
-   **State Persistence**: Login once, reuse across test runs
-   **Environment Isolation**: Dedicated test credentials and configuration
-   **Flexible Selectors**: Handles multiple Auth0 UI variations

#### 📊 **Test Organization**

-   **Clean Output**: All artifacts organized in `e2e/` folder
-   **Git-Ignored Artifacts**: Test results, reports, and auth state excluded from version control
-   **Comprehensive Documentation**: Step-by-step setup and debugging guides
-   **CI-Ready**: Configuration supports both local development and CI/CD

#### 🛠 **Configuration Highlights**

```typescript
// playwright.config.ts
export default defineConfig({
    testDir: './e2e',
    outputDir: './e2e/test-results', // Organized output
    reporter: [['html', { outputFolder: './e2e/playwright-report' }]],

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry', // Debugging traces
        screenshot: 'only-on-failure' // Failure screenshots
    },

    projects: [
        { name: 'setup', testMatch: /.*\.setup\.ts/ },
        {
            name: 'chromium',
            use: { storageState: './e2e/.auth/user.json' }, // Auth persistence
            dependencies: ['setup']
        }
    ],

    webServer: {
        command: 'pnpm dev', // Auto-start dev server
        url: 'http://localhost:3000'
    }
})
```

---

## Test Infrastructure Development Roadmap

### Overview

This roadmap focuses on building test infrastructure that works with a **shared environment** and **pre-configured test users**. Instead of creating isolated test databases, we create robust utilities for managing test users with different roles, permissions, and billing states in the same environment where the application normally runs.

### 📋 Test Infrastructure Todo List

Each todo item includes implementation guidance and a validation test to ensure it works correctly.

#### **1. Test User Management System**

**Priority**: ✅ **COMPLETED** - Users Already Created  
**Implementation Location**: Environment variables in `.env.test`

**Purpose**: ✅ **Done** - Pre-configured test users with different roles are already created and working.

**Current Implementation**:

-   ✅ Three test users created in Auth0 (admin, builder, member)
-   ✅ Environment variables configured for all user credentials
-   ✅ Auth0 organization membership set up
-   ✅ Role-based permissions working correctly

**What's Working**:

```typescript
// Current implementation using environment variables:
// apps/web/e2e/env.example shows the actual setup

TEST_USER_ENTERPRISE_ADMIN_EMAIL=alpha+enterprise-admin@domain.ai
TEST_USER_ENTERPRISE_BUILDER_EMAIL=alpha+enterprise-builder@domain.ai
TEST_USER_ENTERPRISE_MEMBER_EMAIL=alpha+enterprise-member@domain.ai
TEST_USER_PASSWORD=your-secure-test-password
TEST_ENTERPRISE_AUTH0_ORG_ID=org_unQ8OLmTNsxVTJCT
TEST_ENTERPRISE_ORG_NAME=Local Dev

// Usage in tests (from auth.spec.ts):
const testUsers = {
    admin: {
        email: process.env.TEST_USER_ENTERPRISE_ADMIN_EMAIL!,
        password: process.env.TEST_USER_PASSWORD!,
        role: 'admin',
        expectedMenuItems: {
            topLevel: ['Sidekick Studio', 'Profile', 'Billing'],
            upgradeVisible: true
        }
    },
    // ... builder and member users
}
```

**Future Enhancement Ideas** (Optional):

-   Add utilities for test user state management if needed
-   Consider admin API integration for user credit management
-   Add content reset utilities for specific test scenarios

#### **2. Test User Authentication System**

**Priority**: ✅ **COMPLETED** - Authentication Working  
**Implementation Location**: `apps/web/e2e/auth.setup.ts` and `apps/web/e2e/tests/auth.spec.ts`

**Purpose**: ✅ **Done** - Auth0 authentication working with all test user personas.

**Current Implementation**:

-   ✅ Auth0 two-step login flow implemented
-   ✅ Organization selection with precise Auth0 org ID matching
-   ✅ Per-test authentication for different user roles
-   ✅ Robust selectors that handle Auth0 UI variations

**What's Working**:

```typescript
// Current implementation (apps/web/e2e/tests/auth.spec.ts):

// Helper function for per-test authentication
async function loginAsUser(page, email, password, orgId) {
    await page.context().clearCookies()
    await page.goto('/')

    // Step 1: Email input
    const emailInput = page.locator('input[name="username"], input[type="email"]').first()
    await emailInput.fill(email)
    await page.locator('button[type="submit"]').first().click()

    // Step 2: Password input
    await page.waitForSelector('input[name="password"]')
    const passwordInput = page.locator('input[name="password"]').first()
    await passwordInput.fill(password)
    await page.locator('button[type="submit"]').first().click()

    // Step 3: Organization selection (if orgId provided)
    if (orgId) {
        const targetForm = page.locator(`form:has(input[name="organization"][value="${orgId}"])`)
        if (await targetForm.isVisible({ timeout: 5000 })) {
            await targetForm.locator('button[type="submit"]').click()
        }
    }

    await page.waitForURL(/localhost:3000/, { timeout: 20000 })
}

// Role-based testing automatically tests all user types
for (const [userType, userData] of Object.entries(testUsers)) {
    test(`should login as ${userType} and show correct permissions`, async ({ page }) => {
        await loginAsUser(page, userData.email, userData.password, process.env.TEST_ENTERPRISE_AUTH0_ORG_ID)
        // Test permissions...
    })
}
```

**Future Enhancement Ideas** (Optional):

-   Add persistent auth state generation for faster test execution
-   Consider auth state caching between test runs
-   Add utilities for multi-user scenarios in same test

#### **3. Test Content Management**

**Priority**: High  
**Implementation Location**: `tests/utils/testContentManager.ts`

**Purpose**: Manage realistic content for test users including chatflows, document stores, and usage history.

**Key Requirements**:

-   Ensure test users have appropriate content for their scenarios
-   Reset user content to known states for consistent testing
-   Create realistic content patterns that mirror production usage
-   Support for different content states (empty, active, error states)

**Implementation Example**:

```typescript
// tests/utils/testContentManager.ts
export interface ContentProfile {
    chatflows: Array<{
        name: string
        type: 'simple_qa' | 'rag' | 'multi_agent'
        status: 'active' | 'draft' | 'archived'
    }>
    documentStores: Array<{
        name: string
        status: 'ready' | 'processing' | 'error'
        documentCount: number
    }>
    usageHistory: {
        totalQueries: number
        averageCreditsPerQuery: number
        lastActivityDate: string
    }
}

export class TestContentManager {
    private static contentProfiles: Map<string, ContentProfile> = new Map()

    // Define content profiles for different user types
    static initializeProfiles() {
        this.contentProfiles.set('FRESH_USER', {
            chatflows: [],
            documentStores: [],
            usageHistory: {
                totalQueries: 0,
                averageCreditsPerQuery: 0,
                lastActivityDate: new Date().toISOString()
            }
        })

        this.contentProfiles.set('ACTIVE_USER', {
            chatflows: [
                { name: 'Customer Support Bot', type: 'simple_qa', status: 'active' },
                { name: 'Document Q&A', type: 'rag', status: 'active' },
                { name: 'Multi-Agent Research', type: 'multi_agent', status: 'draft' }
            ],
            documentStores: [
                { name: 'Company Docs', status: 'ready', documentCount: 25 },
                { name: 'Product Manuals', status: 'ready', documentCount: 12 }
            ],
            usageHistory: {
                totalQueries: 150,
                averageCreditsPerQuery: 25,
                lastActivityDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
        })

        this.contentProfiles.set('LOW_CREDITS_USER', {
            chatflows: [{ name: 'Basic Chatbot', type: 'simple_qa', status: 'active' }],
            documentStores: [{ name: 'Small Doc Set', status: 'ready', documentCount: 5 }],
            usageHistory: {
                totalQueries: 450,
                averageCreditsPerQuery: 22,
                lastActivityDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            }
        })
    }

    // Ensure user has expected content
    static async ensureUserContent(userKey: string) {
        const profile = this.contentProfiles.get(userKey)
        if (!profile) return

        const userProfile = TestUserManager.getProfile(userKey)
        const apiKey = await this.getApiKeyForUser(userProfile.email)

        // Ensure chatflows exist
        for (const chatflowDef of profile.chatflows) {
            await this.ensureChatflowExists(apiKey, chatflowDef)
        }

        // Ensure document stores exist
        for (const docStoreDef of profile.documentStores) {
            await this.ensureDocumentStoreExists(apiKey, docStoreDef)
        }

        // Set usage history
        await this.setUsageHistory(userProfile.email, profile.usageHistory)
    }

    // Clear all user content
    static async clearUserContent(userKey: string) {
        const userProfile = TestUserManager.getProfile(userKey)
        const apiKey = await this.getApiKeyForUser(userProfile.email)

        await this.deleteAllUserChatflows(apiKey)
        await this.deleteAllUserDocumentStores(apiKey)
        await this.clearUsageHistory(userProfile.email)
    }

    private static async ensureChatflowExists(apiKey: string, chatflowDef: any) {
        // Check if chatflow exists
        const response = await fetch('/api/chatflows', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const chatflows = await response.json()

        const exists = chatflows.some((cf: any) => cf.name === chatflowDef.name)
        if (!exists) {
            await this.createChatflow(apiKey, chatflowDef)
        }
    }

    private static async createChatflow(apiKey: string, chatflowDef: any) {
        const flowData = this.generateFlowData(chatflowDef.type)

        const response = await fetch('/api/chatflows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                name: chatflowDef.name,
                flowData: JSON.stringify(flowData),
                visibility: 'private'
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to create chatflow ${chatflowDef.name}`)
        }
    }

    private static generateFlowData(type: string) {
        const baseFlow = {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
        }

        switch (type) {
            case 'simple_qa':
                return {
                    ...baseFlow,
                    nodes: [
                        { id: '1', type: 'ChatOpenAI', position: { x: 100, y: 100 } },
                        { id: '2', type: 'ConversationChain', position: { x: 300, y: 100 } }
                    ],
                    edges: [{ id: 'e1-2', source: '1', target: '2' }]
                }
            case 'rag':
                return {
                    ...baseFlow,
                    nodes: [
                        { id: '1', type: 'VectorStoreRetriever', position: { x: 100, y: 100 } },
                        { id: '2', type: 'ChatOpenAI', position: { x: 300, y: 100 } },
                        { id: '3', type: 'ConversationalRetrievalQAChain', position: { x: 500, y: 100 } }
                    ],
                    edges: [
                        { id: 'e1-3', source: '1', target: '3' },
                        { id: 'e2-3', source: '2', target: '3' }
                    ]
                }
            default:
                return baseFlow
        }
    }
}
```

**Validation Test**:

```typescript
// tests/utils/testContentManager.spec.ts
describe('Test Content Management', () => {
    test('should ensure user has expected content', async () => {
        TestContentManager.initializeProfiles()

        // Ensure active user has their expected content
        await TestContentManager.ensureUserContent('ACTIVE_USER')

        const userProfile = TestUserManager.getProfile('ACTIVE_USER')
        const apiKey = await getApiKeyForUser(userProfile.email)

        // Verify chatflows exist
        const chatflowsResponse = await fetch('/api/chatflows', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const chatflows = await chatflowsResponse.json()

        expect(chatflows.length).toBe(3)
        expect(chatflows.some((cf: any) => cf.name === 'Customer Support Bot')).toBe(true)
        expect(chatflows.some((cf: any) => cf.name === 'Document Q&A')).toBe(true)

        // Verify document stores exist
        const docsResponse = await fetch('/api/documentstores', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const documentStores = await docsResponse.json()

        expect(documentStores.length).toBe(2)
        expect(documentStores.some((ds: any) => ds.name === 'Company Docs')).toBe(true)
    })

    test('should clear user content for fresh user scenarios', async () => {
        await TestContentManager.clearUserContent('FRESH_USER')

        const userProfile = TestUserManager.getProfile('FRESH_USER')
        const apiKey = await getApiKeyForUser(userProfile.email)

        // Verify no content exists
        const chatflowsResponse = await fetch('/api/chatflows', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const chatflows = await chatflowsResponse.json()
        expect(chatflows.length).toBe(0)

        const docsResponse = await fetch('/api/documentstores', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const documentStores = await docsResponse.json()
        expect(documentStores.length).toBe(0)
    })
})
```

#### **4. User Permission Factories**

**Priority**: High  
**Implementation Location**: `packages/server/test/factories/userFactory.ts`

**Purpose**: Create users with different roles, organizations, and billing states for permission testing.

**Validation Test**:

```typescript
// test/unit/user-factories.spec.ts
describe('User Permission Factories', () => {
    test('should create users with correct permission contexts', async () => {
        const adminUser = await createUser({ role: 'admin', billingState: 'unlimited' })
        const regularUser = await createUser({ role: 'user', billingState: 'free_tier' })
        const limitedUser = await createUser({ role: 'user', billingState: 'at_limit' })

        // Verify user properties
        expect(adminUser.role).toBe('admin')
        expect(adminUser.credits).toBe(1000000)
        expect(regularUser.credits).toBe(10000)
        expect(limitedUser.credits).toBe(50)

        // Test permission matrix
        expect(await checkPermission(adminUser, 'Organization', 'read')).toBe(true)
        expect(await checkPermission(regularUser, 'Organization', 'read')).toBe(false)
        expect(await checkPermission(limitedUser, 'ChatFlow', 'create')).toBe(false) // At limit
    })
})
```

#### **5. ChatFlow Factories**

**Priority**: Medium  
**Implementation Location**: `packages/server/test/factories/chatflowFactory.ts`

**Purpose**: Generate different types of chatflows with various configurations for comprehensive testing.

**Validation Test**:

```typescript
// test/unit/chatflow-factories.spec.ts
describe('ChatFlow Factories', () => {
    test('should create different chatflow types with proper configurations', async () => {
        const simpleFlow = await createChatflow({ type: 'simple_qa' })
        const ragFlow = await createChatflow({ type: 'rag', documentStore: 'with_pdfs' })
        const multiAgentFlow = await createChatflow({ type: 'multi_agent', agents: 3 })

        // Verify flow configurations
        const simpleData = JSON.parse(simpleFlow.flowData)
        expect(simpleData.nodes.some((n) => n.type === 'ChatOpenAI')).toBe(true)

        const ragData = JSON.parse(ragFlow.flowData)
        expect(ragData.nodes.some((n) => n.type === 'VectorStoreRetriever')).toBe(true)

        const multiData = JSON.parse(multiAgentFlow.flowData)
        expect(multiData.nodes.filter((n) => n.type === 'SequentialAgent')).toHaveLength(3)

        // Verify flow can be executed (using mock AI client)
        const response = await testChatflowExecution(simpleFlow.id, 'test question')
        expect(response.status).toBe(200)
    })
})
```

#### **6. DocumentStore Factories**

**Priority**: Medium  
**Implementation Location**: `packages/server/test/factories/documentStoreFactory.ts`

**Purpose**: Create document stores with different states and configurations for testing document processing.

**Validation Test**:

```typescript
// test/unit/documentstore-factories.spec.ts
describe('DocumentStore Factories', () => {
    test('should create document stores in different states', async () => {
        const processingStore = await createDocumentStore({ state: 'processing' })
        const readyStore = await createDocumentStore({ state: 'ready', documents: 5 })
        const errorStore = await createDocumentStore({ state: 'error' })

        expect(processingStore.status).toBe('PROCESSING')
        expect(readyStore.status).toBe('READY')
        expect(errorStore.status).toBe('ERROR')

        // Verify document chunks were created for ready store
        const chunks = await getDocumentChunks(readyStore.id)
        expect(chunks.length).toBeGreaterThan(0)

        // Verify store can be queried when ready
        const queryResult = await queryDocumentStore(readyStore.id, 'test query')
        expect(queryResult.results).toBeDefined()
    })
})
```

#### **7. Billing Mock System**

**Priority**: Critical  
**Implementation Location**: `packages/server/src/services/ai/FakeAiClient.ts`

**Purpose**: Implement AI client abstraction to test billing without real API costs.

**Validation Test**:

```typescript
// test/unit/fake-ai-client.spec.ts
describe('Fake AI Client System', () => {
    test('should simulate credit consumption accurately', async () => {
        const fakeClient = new FakeAiClient()
        fakeClient.mockResponse('test prompt', {
            content: 'test response',
            tokens: 150,
            credits: 15
        })

        const user = await createUser({ credits: 1000, billingState: 'paid' })
        const response = await fakeClient.generate('test prompt', { userId: user.id })

        expect(response.content).toBe('test response')
        expect(response.credits).toBe(15)
        expect(response.tokens).toBe(150)

        // Verify credits were deducted from user
        const updatedUser = await getUser(user.id)
        expect(updatedUser.credits).toBe(985) // 1000 - 15
    })
})
```

#### **8. API Test Framework**

**Priority**: Medium  
**Implementation Location**: `apps/web/e2e/api/`

**Purpose**: Set up fast API testing using Playwright's request context for contract testing.

**Validation Test**:

```typescript
// e2e/api/api-framework.spec.ts
describe('API Test Framework', () => {
    test('should perform CRUD operations with proper authentication', async ({ request }) => {
        const user = await createTestUser({ credits: 1000, role: 'user' })

        const chatflowData = {
            name: 'Test API Flow',
            flowData: JSON.stringify({ nodes: [], edges: [] }),
            visibility: ['private']
        }

        const created = await apiFramework.testCrudOperations('chatflows', chatflowData, user.apiKey)

        expect(created.name).toBe('Test API Flow')
        expect(created.userId).toBe(user.id)
    })
})
```

#### **9. Test State Management**

**Priority**: Critical  
**Implementation Location**: `tests/utils/testStateManager.ts`

**Purpose**: Ensure tests can be run independently by managing user state and preventing test interference.

**Implementation Example**:

```typescript
// tests/utils/testStateManager.ts
export class TestStateManager {
    private static currentTestStates: Map<string, any> = new Map()

    // Prepare user for test with specific state
    static async prepareUserForTest(
        userKey: string,
        testConfig?: {
            credits?: number
            resetContent?: boolean
            clearHistory?: boolean
        }
    ) {
        const config = {
            resetContent: false,
            clearHistory: false,
            ...testConfig
        }

        // Reset to default state first
        await TestUserManager.resetUserToDefaults(userKey)

        // Apply test-specific modifications
        if (config.credits !== undefined) {
            await TestUserManager.adjustUserCredits(userKey, config.credits)
        }

        if (config.resetContent) {
            await TestContentManager.clearUserContent(userKey)
        }

        if (config.clearHistory) {
            await this.clearUserHistory(userKey)
        }

        // Store current state for cleanup
        this.currentTestStates.set(userKey, {
            originalCredits: TestUserManager.getProfile(userKey).credits,
            testConfig: config,
            timestamp: Date.now()
        })
    }

    // Clean up after test
    static async cleanupAfterTest(userKey: string) {
        const testState = this.currentTestStates.get(userKey)
        if (!testState) return

        // Reset user back to their default state
        await TestUserManager.resetUserToDefaults(userKey)

        this.currentTestStates.delete(userKey)
    }

    // Get snapshot of current user state
    static async getUserStateSnapshot(userKey: string) {
        const profile = TestUserManager.getProfile(userKey)
        const apiKey = await getApiKeyForUser(profile.email)

        // Get current credits
        const userResponse = await fetch('/api/users/profile', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const userData = await userResponse.json()

        // Get current content
        const [chatflowsResponse, docsResponse] = await Promise.all([
            fetch('/api/chatflows', { headers: { Authorization: `Bearer ${apiKey}` } }),
            fetch('/api/documentstores', { headers: { Authorization: `Bearer ${apiKey}` } })
        ])

        const chatflows = await chatflowsResponse.json()
        const documentStores = await docsResponse.json()

        return {
            credits: userData.credits,
            chatflowCount: chatflows.length,
            documentStoreCount: documentStores.length,
            lastActivity: userData.lastActivity,
            snapshot: Date.now()
        }
    }

    private static async clearUserHistory(userKey: string) {
        const profile = TestUserManager.getProfile(userKey)

        // Clear usage history via admin API
        await fetch('/api/admin/users/clear-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.ADMIN_API_KEY}`
            },
            body: JSON.stringify({ email: profile.email })
        })
    }
}
```

**Validation Test**:

```typescript
// tests/utils/testStateManager.spec.ts
describe('Test State Management', () => {
    test('should prepare user with specific test configuration', async () => {
        // Prepare user with low credits for testing billing limits
        await TestStateManager.prepareUserForTest('ACTIVE_USER', {
            credits: 100,
            clearHistory: true
        })

        const snapshot = await TestStateManager.getUserStateSnapshot('ACTIVE_USER')

        expect(snapshot.credits).toBe(100)
        // Should still have default content unless resetContent was true
        expect(snapshot.chatflowCount).toBeGreaterThan(0)

        // Cleanup
        await TestStateManager.cleanupAfterTest('ACTIVE_USER')

        // Verify reset back to defaults
        const finalSnapshot = await TestStateManager.getUserStateSnapshot('ACTIVE_USER')
        expect(finalSnapshot.credits).toBe(5000) // Default for ACTIVE_USER
    })

    test('should handle parallel test isolation', async () => {
        // Prepare same user with different configs in parallel
        await Promise.all([
            TestStateManager.prepareUserForTest('REGULAR_USER', { credits: 100 }),
            TestStateManager.prepareUserForTest('ACTIVE_USER', { credits: 200 })
        ])

        // Verify each user has their specific configuration
        const [snapshot1, snapshot2] = await Promise.all([
            TestStateManager.getUserStateSnapshot('REGULAR_USER'),
            TestStateManager.getUserStateSnapshot('ACTIVE_USER')
        ])

        expect(snapshot1.credits).toBe(100)
        expect(snapshot2.credits).toBe(200)

        // Cleanup both
        await Promise.all([TestStateManager.cleanupAfterTest('REGULAR_USER'), TestStateManager.cleanupAfterTest('ACTIVE_USER')])
    })
})
```

#### **10. Permission Matrix Tests**

**Priority**: High  
**Implementation Location**: `packages/server/test/unit/permissions.spec.ts`

**Purpose**: Comprehensive unit tests for all permission combinations.

**Validation Test**:

```typescript
// test/unit/permission-matrix.spec.ts
describe('Permission Matrix Tests', () => {
    test('should enforce complete permission matrix', async () => {
        const testCases = [
            ['admin', 'ChatFlow', 'delete', true],
            ['user', 'ChatFlow', 'delete', false],
            ['user', 'Organization', 'read', false],
            ['org_admin', 'Organization', 'read', true]
        ]

        for (const [role, resource, action, expected] of testCases) {
            const user = await createUser({ role: role as any })
            const hasPermission = await checkAbility(user, resource, action)
            expect(hasPermission).toBe(expected)
        }
    })
})
```

### 🎯 Implementation Priority Order

Based on the shared environment approach:

1. **Test User Management System** ← Start here (foundation)
2. **Test User Authentication System** ← Core authentication infrastructure
3. **Test Content Management** ← Realistic user content scenarios
4. **Billing Mock System** ← Critical for cost-effective testing
5. **Test State Management** ← Parallel test reliability
6. **User Permission Testing** ← Security testing foundation
7. **Scenario-Based Factories** ← Domain-specific testing patterns
8. **API Test Framework** ← Fast integration testing
9. **Comprehensive E2E Scenarios** ← Real-world user journeys

### 🔄 Validation Workflow

For each todo item:

1. **Set up test users** - Create accounts in Auth0 and database
2. **Implement the infrastructure component**
3. **Run validation tests** to ensure it works with real user accounts
4. **Test in target environment** (development/staging) to verify behavior
5. **Update AGENTS.MD** with learnings and working patterns
6. **Mark todo as complete** and move to next item
7. **Integration test** with existing components

### 🏗️ Shared Environment Setup

**Initial Setup Steps:**

1. **Create Test Users in Auth0**: Set up accounts for each test persona
2. **Seed Initial Content**: Give appropriate users their expected chatflows/documents
3. **Configure Admin Access**: Set up admin API keys for test user management
4. **Generate Auth States**: Run auth setup to create persistent login states
5. **Validate Environment**: Ensure all test users can authenticate and access their content

**Ongoing Maintenance:**

-   **Daily Reset**: Reset test user states to defaults
-   **Monitor Credits**: Ensure test users maintain appropriate credit levels
-   **Content Validation**: Verify test content remains consistent
-   **Auth Refresh**: Regenerate auth states when they expire

This approach ensures each component works in realistic conditions while maintaining consistency across test runs.

---

## Summary

This testing strategy provides:

-   **Clear direction**: Focus on critical user journeys first
-   **Practical patterns**: Real code examples you can copy
-   **Scalable architecture**: From simple tests to comprehensive suites
-   **Cost-effective approach**: Test billing logic without spending money
-   **Team onboarding**: Step-by-step exercise to build confidence

The key is to start small with the getting-started exercise, then gradually build up your test coverage following the patterns and principles outlined here.

Remember: **Perfect is the enemy of good**. Start with basic tests that catch real bugs, then improve them over time as you learn what breaks most often in your application.

---

## Shared Environment Testing Benefits

### Why This Approach Works Better

**Realistic Testing Conditions:**

-   Tests run against the same environment as manual QA
-   Real database with actual data relationships
-   Authentic Auth0 authentication flows
-   Production-like performance characteristics

**Simplified Infrastructure:**

-   No complex database isolation or test containers
-   Easier CI/CD setup - just point to staging environment
-   Developers can run tests locally against development environment
-   Reduced infrastructure maintenance overhead

**Better Developer Experience:**

-   Tests mirror how QA team actually tests the application
-   Easier to debug issues when tests fail
-   Can manually verify test scenarios in the same environment
-   Realistic error conditions and edge cases

### Managing Test Data Consistency

**Pre-Configured Test Users:**

```typescript
// Each test user has a known, stable state
const FRESH_USER = {
    email: 'fresh.user@theanswerai-test.com',
    credits: 10000,
    hasContent: false,
    description: 'New user for onboarding tests'
}

const LOW_CREDITS_USER = {
    email: 'lowcredits.user@theanswerai-test.com',
    credits: 50,
    hasContent: true,
    description: 'User approaching credit limit'
}
```

**State Reset Utilities:**

```typescript
// Reset user to known state before/after tests
await TestUserManager.resetUserToDefaults('FRESH_USER')
await TestUserManager.adjustUserCredits('LOW_CREDITS_USER', 50)
```

**Content Management:**

```typescript
// Ensure users have expected content
await TestContentManager.ensureUserContent('ACTIVE_USER')
// Clear content for empty state tests
await TestContentManager.clearUserContent('FRESH_USER')
```

### Environment Setup Guide

**1. Create Test Users in Auth0:**

You'll need to create these users in your Auth0 tenant with the `alpha+XXXX@domain.ai` pattern:

```typescript
// scripts/setup-test-users.ts
// Simplified setup based on ACTUAL permission system

export const TEST_USER_SETUP = [
    // Basic scenarios
    {
        emailEnvVar: 'TEST_USER_FRESH_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'public',
        planType: 'free',
        roles: [],
        permissions: ['chatflow:use'],
        uiRole: 'member',
        initialCredits: 10000,
        needsContent: false,
        description: 'New user for onboarding tests'
    },
    {
        emailEnvVar: 'TEST_USER_LOW_CREDITS_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'public',
        planType: 'free',
        roles: [],
        permissions: ['chatflow:use'],
        uiRole: 'member',
        initialCredits: 50,
        needsContent: true,
        description: 'User approaching credit limit'
    },
    {
        emailEnvVar: 'TEST_USER_NO_CREDITS_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'public',
        planType: 'free',
        roles: [],
        permissions: ['chatflow:use'],
        uiRole: 'member',
        initialCredits: 0,
        needsContent: true,
        description: 'User with exhausted credits'
    },

    // Public domain users
    {
        emailEnvVar: 'TEST_USER_FREE_TIER_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'public',
        planType: 'free',
        roles: [],
        permissions: ['chatflow:use'],
        uiRole: 'member',
        initialCredits: 5000,
        needsContent: true,
        description: 'Free tier user on public domain'
    },
    {
        emailEnvVar: 'TEST_USER_PRO_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'public',
        planType: 'pro',
        roles: [],
        permissions: ['chatflow:manage', 'chatflow:use'],
        uiRole: 'builder',
        initialCredits: 50000,
        needsContent: true,
        description: 'Pro plan user on public domain'
    },

    // Enterprise client users
    {
        emailEnvVar: 'TEST_USER_ENTERPRISE_ADMIN_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'enterprise',
        planType: 'enterprise',
        roles: ['Admin'],
        permissions: ['org:manage', 'chatflow:manage', 'chatflow:use'],
        uiRole: 'admin',
        initialCredits: 100000,
        needsContent: true,
        description: 'Enterprise admin with full organization access'
    },
    {
        emailEnvVar: 'TEST_USER_ENTERPRISE_BUILDER_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'enterprise',
        planType: 'enterprise',
        roles: [],
        permissions: ['chatflow:manage', 'chatflow:use'],
        uiRole: 'builder',
        initialCredits: 75000,
        needsContent: true,
        description: 'Enterprise builder with chatflow creation capabilities'
    },
    {
        emailEnvVar: 'TEST_USER_ENTERPRISE_MEMBER_EMAIL',
        passwordEnvVar: 'TEST_USER_PASSWORD',
        organizationType: 'enterprise',
        planType: 'enterprise',
        roles: [],
        permissions: ['chatflow:use'],
        uiRole: 'member',
        initialCredits: 25000,
        needsContent: true,
        description: 'Enterprise member with chatflow usage only'
    }
]

// Helper function to get user setup with email and password from env
export const getTestUserSetup = (userSetup: any) => ({
    ...userSetup,
    email: process.env[userSetup.emailEnvVar],
    password: process.env[userSetup.passwordEnvVar]
})
```

**2. Auth0 User Creation Script:**

```bash
# Create a script to set up all test users in Auth0
node scripts/create-auth0-test-users.js
```

**3. Database Setup Script:**

```typescript
// scripts/seed-test-users.ts
export const setupTestUsers = async () => {
    for (const userSetup of TEST_USER_SETUP) {
        const userWithCredentials = getTestUserSetup(userSetup)

        if (!userWithCredentials.email) {
            throw new Error(`Email not found for user setup. Check environment variable: ${userSetup.emailEnvVar}`)
        }

        console.log(`Setting up ${userWithCredentials.email}...`)

        // 1. Create organization for user
        const org = await createOrganization({
            name: `Test Org for ${userSetup.emailEnvVar}`,
            type: userSetup.organizationType,
            planType:
                userSetup.organizationType === 'free'
                    ? 'free'
                    : userSetup.organizationType === 'pro'
                    ? 'pro'
                    : userSetup.organizationType === 'enterprise'
                    ? 'enterprise'
                    : 'free'
        })

        // 2. Create user in database
        const user = await createUser({
            email: userWithCredentials.email,
            auth0Id: `auth0|${generateUserId()}`, // You'll get this from Auth0
            organizationId: org.id,
            role: userSetup.role,
            credits: userSetup.initialCredits
        })

        // 3. Set up content if needed
        if (userSetup.needsContent) {
            await createDefaultContent(user.id, org.id)
        }

        console.log(`✓ Set up ${userWithCredentials.email} with ${userSetup.initialCredits} credits`)
    }
}
```

**4. Generate Authentication States:**

```bash
# Run auth setup to create persistent login states for all users
pnpm test:e2e:generate-auth-states
```

**5. Validation Script:**

```typescript
// Verify all test users can authenticate and have expected data
pnpm test:validate-test-users
```

**6. Maintenance Automation:**

```bash
# Daily reset script to restore all users to default state
pnpm test:reset-all-users

# Verify test data integrity
pnpm test:validate-environment

# Reset specific user (uses email from env var)
pnpm test:reset-user $TEST_USER_FRESH_EMAIL
```

### Quick Setup Commands

Here are the commands you'll run to set up the entire test environment:

```bash
# 1. Create .env.test file (see template below)
cp apps/web/.env.test.example apps/web/.env.test
# Edit .env.test with your actual values

# 2. Create Auth0 users
node scripts/create-auth0-test-users.js

# 3. Seed database with test users and content
node scripts/seed-test-users.ts

# 4. Generate authentication states for tests
pnpm test:e2e:generate-auth-states

# 5. Validate everything works
pnpm test:validate-test-users
```

### `.env.test` Template

Create `apps/web/.env.test` (never commit this file):

```bash
# apps/web/.env.test
# Test Environment Configuration - DO NOT COMMIT THIS FILE

# Test User Credentials
TEST_USER_PASSWORD=YourSecureTestPassword123!

# Auth0 Configuration
AUTH0_SECRET=your-auth0-secret-for-tests
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret

# Auth0 Management API (for creating test users)
AUTH0_MANAGEMENT_DOMAIN=your-domain.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=your-mgmt-api-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-mgmt-api-client-secret
AUTH0_MANAGEMENT_AUDIENCE=https://your-domain.auth0.com/api/v2/

# Database Configuration
DATABASE_URL=your-test-database-url

# Admin API Key (for test user management)
ADMIN_API_KEY=your-admin-api-key-for-tests

# Application URLs
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api

# External Service Configuration (use test/mock endpoints)
OPENAI_API_KEY=test-key-or-mock
STRIPE_SECRET_KEY=sk_test_your-test-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-test-key

# Disable expensive operations in tests
DISABLE_EXTERNAL_APIS=true
MOCK_AI_RESPONSES=true
MOCK_BILLING=true
```

### `.env.test.example` Template

Create `apps/web/.env.test.example` (commit this file as a template):

```bash
# apps/web/.env.test.example
# Test Environment Configuration Template
# Copy this to .env.test and fill in your actual values

# Test User Credentials
TEST_USER_PASSWORD=YourSecureTestPassword123!

# Auth0 Configuration
AUTH0_SECRET=your-auth0-secret-for-tests
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret

# Auth0 Management API (for creating test users)
AUTH0_MANAGEMENT_DOMAIN=your-domain.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=your-mgmt-api-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-mgmt-api-client-secret
AUTH0_MANAGEMENT_AUDIENCE=https://your-domain.auth0.com/api/v2/

# Database Configuration
DATABASE_URL=your-test-database-url

# Admin API Key (for test user management)
ADMIN_API_KEY=your-admin-api-key-for-tests

# Application URLs
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api

# External Service Configuration (use test/mock endpoints)
OPENAI_API_KEY=test-key-or-mock
STRIPE_SECRET_KEY=sk_test_your-test-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-test-key

# Disable expensive operations in tests
DISABLE_EXTERNAL_APIS=true
MOCK_AI_RESPONSES=true
MOCK_BILLING=true
```

### Security Configuration

**Gitignore Setup:**

Ensure your `.gitignore` includes:

```bash
# Environment files
.env.test
.env.local
.env.development.local
.env.staging.local
.env.production.local

# Test artifacts
apps/web/e2e/.auth/
apps/web/e2e/test-results/
apps/web/e2e/playwright-report/

# Test user management
scripts/auth0-users.json
test-users-backup.json
```

**Environment Variable Security:**

```typescript
// tests/utils/envValidation.ts
export const validateTestEnvironment = () => {
    const requiredVars = ['TEST_USER_PASSWORD', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'DATABASE_URL', 'ADMIN_API_KEY']

    const missing = requiredVars.filter((varName) => !process.env[varName])

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    // Validate password strength
    const password = process.env.TEST_USER_PASSWORD!
    if (password.length < 12) {
        throw new Error('TEST_USER_PASSWORD must be at least 12 characters')
    }

    console.log('✓ Test environment variables validated')
}
```

**CI/CD Secrets Management:**

For GitHub Actions, set these as repository secrets:

-   `TEST_USER_PASSWORD`
-   `AUTH0_CLIENT_SECRET`
-   `AUTH0_MANAGEMENT_CLIENT_SECRET`
-   `DATABASE_URL`
-   `ADMIN_API_KEY`

### Testing in Different Environments

**Development:**

-   Run tests against `localhost:3000`
-   Use development database with test user accounts
-   Mock external APIs (OpenAI, Stripe) to avoid costs
-   Load `.env.test` for local testing

**Staging:**

-   Run tests against staging URL
-   Use staging database with dedicated test users
-   Use test API keys for external services
-   Environment variables from CI/CD secrets

**Production (Canary):**

-   Limited test suite with production test accounts
-   Real API keys with billing alerts
-   Focus on critical path verification only
-   Separate production test user accounts

### Test User Management Scripts

**Password Update Script:**

```typescript
// scripts/update-test-user-passwords.ts
export const updateAllTestUserPasswords = async (newPassword: string) => {
    const users = Object.values(TEST_USER_SETUP)

    for (const user of users) {
        await updateAuth0UserPassword(user.email, newPassword)
        console.log(`✓ Updated password for ${user.email}`)
    }

    console.log('Update your .env.test file with the new TEST_USER_PASSWORD')
}
```

This approach provides the best balance of realism, maintainability, and security while ensuring tests accurately reflect how users actually interact with your application.
