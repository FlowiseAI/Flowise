# @flowiseai/observe — Testing Guide

## Running Tests

```bash
pnpm test              # Fast run (no coverage)
pnpm test:coverage     # With coverage enforcement
pnpm test:watch        # Watch mode during development
```

## Test Strategy

Tests are prioritized by impact. When modifying a file, add or update tests in the same PR.

### Tier 1 — Core Logic (must test)

Pure business logic in `infrastructure/` and critical hooks. These carry the highest risk — a bug here affects every consumer of the SDK. Always test in the same PR when modifying.

**What belongs here:** API client methods, context/store, data-transformation hooks (`useExecutionTree`).

### Tier 2 — Feature Hooks (test when changing)

Feature-level hooks that orchestrate polling and UI state. Test when adding features or fixing bugs.

**What belongs here:** `useExecutionPoll`, any future pagination or filter hooks.

### Tier 3 — UI Components (test if logic exists)

Presentational components that are mostly JSX. Only add tests if the component contains meaningful business logic. Pure layout/display components do not need tests.

## Writing Tests

### File Extension Convention

The Jest config uses file extensions to select the test environment:

| Extension   | Environment             | When to use                                                                |
| ----------- | ----------------------- | -------------------------------------------------------------------------- |
| `.test.ts`  | **node** (no DOM)       | Pure logic — utilities, API clients, data transformations                  |
| `.test.tsx` | **jsdom** (browser DOM) | Anything that renders React — `renderHook` with providers, component tests |

Source files use `.tsx` only when they contain JSX syntax. A hook that has no JSX stays `.ts` even if its test is `.test.tsx` (because the test uses `renderHook` with a JSX wrapper).

### Mocking Patterns

**Mocking axios:**

```typescript
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const mockGet = jest.fn()
mockedAxios.create.mockReturnValue({ get: mockGet, post: jest.fn(), delete: jest.fn(), put: jest.fn() } as any)
```

**Mocking context hooks:**

```typescript
jest.mock('@/infrastructure/store', () => ({
    useObserveApi: () => mockApiClient,
    useObserveConfig: () => ({ pollInterval: 3000 })
}))
```

### Module Mocks

**Axios** (`src/__mocks__/axios.ts`): Prevents network errors by mocking all HTTP methods. Returns empty arrays/objects by default.

**CSS/SVG** (`src/__mocks__/styleMock.js`): Empty object export for CSS and SVG imports.

**Canvas** (`src/__mocks__/canvas.js`): Empty object export — also intercepted at the Node.js level by the custom jsdom environment (see below).

### Custom Jest Environment

`src/__test_utils__/jest-environment-jsdom.js` intercepts `require('canvas')` and returns a mock before jsdom tries to load the native binary. This prevents build failures in environments without native canvas compilation.

## Configuration

-   **Jest config**: `jest.config.js` — two projects: `unit` (node env, `.test.ts`) and `components` (custom jsdom env, `.test.tsx`)
-   **Import aliases**: `@test-utils` maps to `src/__test_utils__`, `@/` maps to `src/`
-   **Coverage thresholds**: 80% floor for `branches`, `functions`, `lines`, `statements` — see `coverageThreshold` in `jest.config.js` for per-path entries
-   **Coverage exclusions**: `src/__test_utils__/**`, `src/__mocks__/**`, `src/**/index.ts`
-   **Reports**: `coverage/lcov-report/index.html` for detailed HTML report
