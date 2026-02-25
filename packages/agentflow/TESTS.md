# @flowiseai/agentflow Test Plan

## Running Tests

```bash
# Fast run (no coverage)
pnpm test

# With coverage enforcement
pnpm test:coverage

# Watch mode during development
pnpm test:watch
```

## Test Coverage by Tier

Add tests when actively working on these files. Each tier reflects impact and testability.

### Tier 1 — Core Logic

These modules carry the highest risk. Test in the same PR when modifying.

<!-- prettier-ignore -->
| File | Key exports to test | Status |
| --- | --- | --- |
| `src/core/validation/` | `validateFlow`, `validateNode` — empty flows, missing/multiple starts, disconnected nodes, cycles, required inputs | ✅ Done |
| `src/core/utils/` | `getUniqueNodeId`, `getUniqueNodeLabel`, `initNode`, `generateExportFlowData`, `isValidConnectionAgentflowV2` | ✅ Done |
| `src/core/node-catalog/` | `filterNodesByComponents`, `isAgentflowNode`, `groupNodesByCategory` | ✅ Done |
| `src/core/node-config/` | `getAgentflowIcon`, `getNodeColor` | ✅ Done |
| `src/core/theme/tokens.ts` | All design tokens — node colors, light/dark variants, spacing scale, semantic colors, ReactFlow colors, shadows, border radius, gradients | ✅ Done |
| `src/core/theme/cssVariables.ts` | `generateCSSVariables()` — valid CSS strings, all variables, correct light/dark values, proper formatting, consistency with tokens | ✅ Done |
| `src/core/theme/createAgentflowTheme.ts` | `createAgentflowTheme()` — MUI theme creation, palette mode, colors from tokens, custom card palette, spacing, border radius, consistency | ✅ Done |
| `src/infrastructure/api/client.ts` | `createApiClient` — headers, auth token, 401 interceptor | ✅ Done |
| `src/infrastructure/api/chatflows.ts` | All CRUD + `generateAgentflow` + `getChatModels`, FlowData serialization | ✅ Done |
| `src/infrastructure/api/nodes.ts` | `getAllNodes`, `getNodeByName`, `getNodeIconUrl` | ✅ Done |
| `src/infrastructure/store/AgentflowContext.tsx` | `agentflowReducer` (all actions), `normalizeNodes`, `deleteNode()`, `duplicateNode()`. Remaining:  `updateNodeData()`, `getFlowData()` | 🟡 Partial|
| `src/useAgentflow.ts` | `getFlow()`, `toJSON()`, `validate()`, `addNode()`, `clear()` | ⬜ Not yet — thin wrapper |
| `src/features/canvas/hooks/useFlowHandlers.ts` | `handleConnect`, `handleNodesChange`, `handleEdgesChange`, `handleAddNode` — synchronous `onFlowChange` callbacks, dirty tracking, viewport resolution, change filtering | ✅ Done |

### Tier 2 — Feature Hooks & Dialogs

Test when adding features or fixing bugs in these areas.

<!-- prettier-ignore -->
| File | Key exports to test | Status |
| --- | --- | --- |
| `src/features/node-palette/search.ts` | `fuzzyScore`, `searchNodes`, `debounce` | ✅ Done |
| `src/features/canvas/hooks/useFlowNodes.ts` | `useFlowNodes()` — category filtering, component whitelist, error states | ⬜ Not yet |
| `src/features/canvas/hooks/useDragAndDrop.ts` | `useDragAndDrop()` — JSON parse error handling, node init on drop | ⬜ Not yet |
| `src/features/canvas/hooks/useNodeColors.ts` | `useNodeColors()` — color calculations for selected/hover/dark mode | ⬜ Not yet |
| `src/infrastructure/store/ConfigContext.tsx` | `ConfigProvider` — theme detection (light/dark/system), media query listener | ⬜ Not yet |
| `src/features/generator/GenerateFlowDialog.tsx` | Dialog state machine — API call flow, error handling, progress state | ⬜ Not yet |
| `src/features/node-editor/EditNodeDialog.tsx` | Label editing — keyboard handling (Enter/Escape), node data updates | ⬜ Not yet |
| `src/infrastructure/api/hooks/useApi.ts` | `useApi()` — loading/error/data state transitions | ⬜ Not yet — may be deprecated |

### Tier 3 — UI Components

Mostly JSX with minimal logic. Only add tests if business logic is introduced.

<!-- prettier-ignore -->
| File | When to add tests | Status |
| --- | --- | --- |
| `src/features/node-palette/AddNodesDrawer.tsx` | If category grouping or drag serialization logic changes | ⬜ Not yet |
| `src/features/canvas/components/NodeOutputHandles.tsx` | Has `getMinimumNodeHeight()` — test if calculation logic changes | ⬜ Not yet |
| `src/features/canvas/containers/AgentFlowNode.tsx` | If warning state or color logic becomes more complex | ⬜ Not yet |
| `src/features/canvas/containers/AgentFlowEdge.tsx` | If edge deletion or interaction logic changes | ⬜ Not yet |
| `src/features/canvas/containers/IterationNode.tsx` | If resize or dimension calculation logic changes | ⬜ Not yet |
| `src/atoms/ConfirmDialog.tsx` | If promise-based confirmation pattern is modified | ⬜ Not yet |
| `src/atoms/NodeInputHandler.tsx` | If input rendering or position calculation logic changes | ⬜ Not yet |
| `src/features/canvas/components/ConnectionLine.tsx` | If edge label determination logic becomes more complex | ⬜ Not yet |
| `src/features/canvas/components/NodeStatusIndicator.tsx` | If status-to-color/icon mapping expands | ⬜ Not yet |
| `src/Agentflow.tsx` | Integration test — dark mode, ThemeProvider, CSS variables, header rendering, keyboard shortcuts (Cmd+S / Ctrl+S save), generate flow dialog, imperative ref | ✅ Done |

Files that are pure styling or data constants (`styled.ts`, `nodeIcons.ts`, `MainCard.tsx`, `Input.tsx`, etc.) do not need dedicated tests.

## Test Utilities

### Factory Functions (`src/__test_utils__/factories.ts`)

Use factory functions to create test fixtures with sensible defaults:

```typescript
import { makeFlowNode, makeFlowEdge, makeNodeData } from '@test-utils/factories'

// Create test nodes
const node = makeFlowNode('node-1', {
    type: 'agentflowNode',
    data: { name: 'llmAgentflow', label: 'LLM' }
})

// Create test edges
const edge = makeFlowEdge('node-1', 'node-2')

// Create node data (for palette/search tests)
const nodeData = makeNodeData({ name: 'llmAgentflow', label: 'LLM' })
```

### Custom Jest Environment

**File**: `src/__test_utils__/jest-environment-jsdom.js`

Prevents the `canvas` native module from being loaded during jsdom initialization. The canvas package requires native compilation which fails in many environments, but it's only an optional dependency of jsdom and not needed for React component tests.

This custom environment intercepts `require('canvas')` at the module level and returns a mock before jsdom tries to load the native binary.

### Module Mocks

**ReactFlow Mock** (`src/__mocks__/reactflow.tsx`): Provides mock implementations of ReactFlow components and hooks.

Key features:

-   Uses `forwardRef` for MUI `styled()` compatibility (prevents emotion errors)
-   Uses `useState` internally to maintain stable references (prevents infinite re-render loops)
-   Exports all commonly used ReactFlow components (`Controls`, `MiniMap`, `Background`, etc.)
-   Mocks hooks (`useNodesState`, `useEdgesState`, `useReactFlow`)

**Axios Mock** (`src/__mocks__/axios.ts`): Prevents network errors by mocking all HTTP requests. Returns empty arrays/objects for all API calls to silence network warnings in tests.

**CSS Mock** (`src/__mocks__/styleMock.js`): Empty object export for CSS imports.

## Configuration

-   **Jest config**: `jest.config.js` — two projects: `unit` (node env, `.test.ts`) and `components` (custom jsdom env, `.test.tsx`)
-   **Test environment**: Component tests use custom jsdom environment (`src/__test_utils__/jest-environment-jsdom.js`) to handle canvas loading
-   **Import aliases**: `@test-utils` maps to `src/__test_utils__` for convenient imports
-   **Coverage thresholds**: uniform 80% floor (`branches`, `functions`, `lines`, `statements`) enforced per-path:
    -   `./src/Agentflow.tsx`
    -   `./src/core/`
    -   `./src/features/canvas/hooks/useFlowHandlers.ts`
    -   `./src/features/node-palette/search.ts`
    -   `./src/infrastructure/api/`
    -   ⏳ `./src/infrastructure/store/AgentflowContext.tsx` — will be added when coverage reaches 80%
-   **Coverage exclusions**:
    -   `src/__test_utils__/**` — test utilities
    -   `src/__mocks__/**` — module mocks
    -   `src/infrastructure/api/hooks/useApi.ts` — potentially deprecated
-   **CI**: `pnpm test:coverage` runs in GitHub Actions between lint and build
-   **Reports**: `coverage/lcov-report/index.html` for detailed HTML report
