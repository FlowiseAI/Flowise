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

**Currently classified as Tier 3 (no `coverageThreshold` entry):**

-   `ExecutionsListTable.tsx`, `ExecutionsViewer.tsx` — data-table + outer composition shells.

`ExecutionDetail.tsx` was promoted to Tier 2 once it grew real branching (initial-selection rule, copy-id flow, error/loading/empty states). Drag-resize lives in `useResizableSidebar` and the recursive tree renderer in `<ExecutionTreeSidebar>`, both tested in isolation; the orchestrator's own tests cover composition + the auto-select branches.

If any of these grows real branching logic (filter predicates, sort comparators, debounced handlers), promote it to Tier 2 by adding a `coverageThreshold` entry in `jest.config.js` and writing the corresponding tests.

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

## Best Practices

> The same content lives in the `dev-implement-jira` skill so it's discoverable cross-package. Keep both copies in sync when editing.

### Test behavior, not implementation

Assert on what a consumer of the unit observes — return values, rendered output, calls made to dependencies — not on internal state or which private helper ran. A refactor that preserves behavior should not break tests.

### Use Arrange-Act-Assert structure

Group each test into three blocks: set up inputs and mocks, invoke the unit under test, then assert. Keeping the steps visually distinct makes failures easier to diagnose.

### One concept per test

Each `it(...)` should verify a single behavior. Multiple low-level `expect` calls are fine if they describe one concept (e.g. one rendered tree shape), but unrelated assertions belong in separate tests so a failure points to a single cause.

### Write descriptive test names

Name tests by scenario and expected outcome: `it('returns empty tree when execution has no nodes')`, not `it('works')`. Prefer `describe` blocks per function or component, with `it` names that read as full sentences.

### Keep tests independent and deterministic

Reset state between tests — call `jest.clearAllMocks()` in `beforeEach` and avoid module-level mutable variables. No test should depend on execution order. Avoid real timers, real network, or `Date.now()` without `jest.useFakeTimers()`.

### Mock at boundaries, not internals

Mock external dependencies (axios, the API client, browser globals) and let internal modules run as written. Over-mocking internal collaborators couples tests to structure and hides integration bugs.

### Cover meaningful edge cases

For data transforms and hooks, add tests for empty input, single-element input, error/loading states, and any branch in the code. Coverage percentage is a floor — a 100%-covered function with only happy-path tests still has gaps.

### Prefer `userEvent` over `fireEvent`

When testing components, `@testing-library/user-event` simulates real interaction sequences (focus, keystrokes, click order). Use `fireEvent` only for events `userEvent` cannot synthesize.

### Query by accessible role and text

`getByRole`, `getByLabelText`, and `getByText` produce tests that double as accessibility checks. Reach for `getByTestId` only when no semantic query works.

### Keep test data minimal

Build fixtures with the smallest fields needed to exercise the behavior. Use factory helpers (or inline object literals) and override only the fields the test cares about — extraneous data hides what the test is actually asserting.

## Configuration

-   **Jest config**: `jest.config.js` — two projects: `unit` (node env, `.test.ts`) and `components` (custom jsdom env, `.test.tsx`)
-   **Import aliases**: `@test-utils` maps to `src/__test_utils__`, `@/` maps to `src/`
-   **Coverage thresholds**: 80% floor for `branches`, `functions`, `lines`, `statements` — see `coverageThreshold` in `jest.config.js` for per-path entries
-   **Coverage exclusions**: `src/__test_utils__/**`, `src/__mocks__/**`, `src/**/index.ts`
-   **Reports**: `coverage/lcov-report/index.html` for detailed HTML report
