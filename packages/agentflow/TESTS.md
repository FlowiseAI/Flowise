# @flowise/agentflow Test Plan

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

| File | Key exports to test | Status |
|------|-------------------|--------|
| `src/core/validation/` | `validateFlow`, `validateNode` — empty flows, missing/multiple starts, disconnected nodes, cycles, required inputs | ✅ Done |
| `src/core/utils/` | `getUniqueNodeId`, `getUniqueNodeLabel`, `initializeDefaultNodeData`, `initNode`, `generateExportFlowData`, `isValidConnectionAgentflowV2` | ✅ Done |
| `src/core/node-catalog/` | `filterNodesByComponents`, `isAgentflowNode`, `groupNodesByCategory` | ✅ Done |
| `src/core/node-config/` | `getAgentflowIcon`, `getNodeColor` | ✅ Done |
| `src/infrastructure/api/client.ts` | `createApiClient` — headers, auth token, 401 interceptor | ✅ Done |
| `src/infrastructure/api/chatflows.ts` | All CRUD + `generateAgentflow` + `getChatModels`, FlowData serialization | ✅ Done |
| `src/infrastructure/api/nodes.ts` | `getAllNodes`, `getNodeByName`, `getNodeIconUrl` | ✅ Done |
| `src/infrastructure/store/AgentflowContext.tsx` | `agentflowReducer` (all action types), `normalizeNodes`. Remaining: `deleteNode()`, `duplicateNode()`, `updateNodeData()`, `getFlowData()` — React callbacks, test when provider stabilizes | 🟡 Partial |
| `src/useAgentflow.ts` | `getFlow()`, `toJSON()`, `validate()`, `addNode()`, `clear()` | ⬜ Not yet — thin wrapper, test when hook gains own logic |
| `src/features/canvas/hooks/useFlowHandlers.ts` | `onConnect`, `onNodesChange`, `onEdgesChange`, `onAddNode` | ⬜ Not yet — heavily coupled to ReactFlow, test when handlers stabilize |

### Tier 2 — Feature Hooks & Dialogs

Test when adding features or fixing bugs in these areas.

| File | Key exports to test | Status |
|------|-------------------|--------|
| `src/features/node-palette/search.ts` | `fuzzyScore`, `searchNodes`, `debounce` | ✅ Done |
| `src/features/canvas/hooks/useFlowNodes.ts` | `useFlowNodes()` — category filtering, component whitelist, error states | ⬜ Not yet |
| `src/features/canvas/hooks/useDragAndDrop.ts` | `useDragAndDrop()` — JSON parse error handling, node init on drop | ⬜ Not yet |
| `src/features/canvas/hooks/useNodeColors.ts` | `useNodeColors()` — color calculations for selected/hover/dark mode | ⬜ Not yet |
| `src/infrastructure/store/ConfigContext.tsx` | `ConfigProvider` — theme detection (light/dark/system), media query listener | ⬜ Not yet |
| `src/features/generator/GenerateFlowDialog.tsx` | Dialog state machine — API call flow, error handling, progress state | ⬜ Not yet |
| `src/features/node-editor/EditNodeDialog.tsx` | Label editing — keyboard handling (Enter/Escape), node data updates | ⬜ Not yet |
| `src/infrastructure/api/hooks/useApi.ts` | `useApi()` — loading/error/data state transitions | ⬜ Not yet — may be deprecated, check before investing |

### Tier 3 — UI Components

Mostly JSX with minimal logic. Only add tests if business logic is introduced.

| File | When to add tests | Status |
|------|------------------|--------|
| `src/features/node-palette/AddNodesDrawer.tsx` | If category grouping or drag serialization logic changes | ⬜ Not yet |
| `src/features/canvas/components/NodeOutputHandles.tsx` | Has `getMinimumNodeHeight()` pure function — test if calculation logic changes | ⬜ Not yet |
| `src/features/canvas/containers/AgentFlowNode.tsx` | If warning state or color logic becomes more complex | ⬜ Not yet |
| `src/features/canvas/containers/AgentFlowEdge.tsx` | If edge deletion or interaction logic changes | ⬜ Not yet |
| `src/features/canvas/containers/IterationNode.tsx` | If resize or dimension calculation logic changes | ⬜ Not yet |
| `src/atoms/ConfirmDialog.tsx` | If promise-based confirmation pattern is modified | ⬜ Not yet |
| `src/atoms/NodeInputHandler.tsx` | If input rendering or position calculation logic changes | ⬜ Not yet |
| `src/features/canvas/components/ConnectionLine.tsx` | If edge label determination logic becomes more complex | ⬜ Not yet |
| `src/features/canvas/components/NodeStatusIndicator.tsx` | If status-to-color/icon mapping expands | ⬜ Not yet |
| `src/Agentflow.tsx` | Integration test when component orchestration is stable | ⬜ Not yet |

Files that are pure styling or data constants (`styled.ts`, `nodeIcons.ts`, `MainCard.tsx`, `Input.tsx`, etc.) do not need dedicated tests.

## Configuration

- **Jest config**: `jest.config.js` — two projects: `unit` (node env, `.test.ts`) and `components` (jsdom env, `.test.tsx`)
- **Coverage thresholds**: uniform 80% floor (`branches`, `functions`, `lines`, `statements`) enforced per-path:
  - `./src/core/`
  - `./src/infrastructure/api/`
  - `./src/features/node-palette/search.ts`
- **Exclusions**: `src/infrastructure/api/hooks/useApi.ts` is excluded from coverage collection (potentially deprecated — check before investing in tests)
- **CI**: `pnpm test:coverage` runs in GitHub Actions between lint and build
- **Reports**: `coverage/lcov-report/index.html` for detailed HTML report
