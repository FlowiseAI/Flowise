# @flowiseai/agentflow — Testing Guide

## Running Tests

```bash
pnpm test              # Fast run (no coverage)
pnpm test:coverage     # With coverage enforcement
pnpm test:watch        # Watch mode during development
```

## Test Strategy

Tests are prioritized by impact. When modifying a file, add or update tests in the same PR.

### Tier 1 — Core Logic (must test)

Pure business logic in `core/`, `infrastructure/`, and critical hooks. These carry the highest risk — a bug here affects every user. Always test in the same PR when modifying.

**What belongs here:** validation rules, node utilities, API clients, state management (reducers, context actions), flow data hooks (`useFlowHandlers`).

### Tier 2 — Feature Hooks & Dialogs (test when changing)

Feature-level hooks and dialog components that orchestrate UI behavior. Test when adding features or fixing bugs.

**What belongs here:** search logic, drag-and-drop, node color calculations, dialog state machines, theme detection.

### Tier 3 — UI Components (test if logic exists)

Presentational components that are mostly JSX. Only add tests if the component contains meaningful business logic (e.g., an exported helper function). Pure styling components (`styled.ts`, `MainCard.tsx`, etc.) do not need tests.

## Writing Tests

### File Extension Convention

The Jest config uses file extensions to select the test environment:

| Extension   | Environment             | When to use                                                                |
| ----------- | ----------------------- | -------------------------------------------------------------------------- |
| `.test.ts`  | **node** (no DOM)       | Pure logic — utilities, reducers, data transformations                     |
| `.test.tsx` | **jsdom** (browser DOM) | Anything that renders React — `renderHook` with providers, component tests |

Source files use `.tsx` only when they contain JSX syntax. A hook like `useAgentflow.ts` has no JSX, so it stays `.ts` even though its test is `.test.tsx` (because the test uses `renderHook` with a JSX wrapper).

### Factory Functions

Use factory functions from `@test-utils/factories` to create test fixtures with sensible defaults:

```typescript
import { makeFlowNode, makeFlowEdge, makeNodeData } from '@test-utils/factories'

const node = makeFlowNode('node-1', {
    type: 'agentflowNode',
    data: { name: 'llmAgentflow', label: 'LLM' }
})

const edge = makeFlowEdge('node-1', 'node-2')

const nodeData = makeNodeData({ name: 'llmAgentflow', label: 'LLM' })
```

### Mocking Patterns

**Mocking a module with `jest.mock`:**

```typescript
import { isValidConnectionAgentflowV2 } from '@/core'

jest.mock('@/core', () => ({
    isValidConnectionAgentflowV2: jest.fn(() => true),
    getUniqueNodeId: jest.fn(() => 'new-node-1')
}))

// Override per-test:
it('should reject invalid connection', () => {
    ;(isValidConnectionAgentflowV2 as jest.Mock).mockReturnValueOnce(false)
    // ...
})
```

**Mocking context hooks:**

```typescript
const mockSetDirty = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { reactFlowInstance: null },
        setDirty: mockSetDirty
    })
}))
```

### Module Mocks

**ReactFlow** (`src/__mocks__/reactflow.tsx`): Mock implementations of ReactFlow components and hooks. Uses `forwardRef` for MUI `styled()` compatibility and `useState` internally for stable references.

**Axios** (`src/__mocks__/axios.ts`): Prevents network errors by mocking all HTTP methods. Returns empty arrays/objects by default.

**CSS/SVG** (`src/__mocks__/styleMock.js`): Empty object export for CSS and SVG imports.

### Custom Jest Environment

`src/__test_utils__/jest-environment-jsdom.js` intercepts `require('canvas')` and returns a mock before jsdom tries to load the native binary. This prevents build failures in environments without native canvas compilation.

## Configuration

-   **Jest config**: `jest.config.js` — two projects: `unit` (node env, `.test.ts`) and `components` (custom jsdom env, `.test.tsx`)
-   **Import aliases**: `@test-utils` maps to `src/__test_utils__`, `@/` maps to `src/`
-   **Coverage thresholds**: 80% floor for `branches`, `functions`, `lines`, `statements` — see `coverageThreshold` in `jest.config.js` for per-path entries
-   **Coverage exclusions**: `src/__test_utils__/**`, `src/__mocks__/**`
-   **CI**: `pnpm test:coverage` runs in GitHub Actions between lint and build
-   **Reports**: `coverage/lcov-report/index.html` for detailed HTML report
