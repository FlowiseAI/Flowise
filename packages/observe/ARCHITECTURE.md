# @flowiseai/observe - Architecture

This document describes the internal architecture of the `@flowiseai/observe` package.

## Overview

The package follows a **Domain-Driven Modular Architecture** with clear separation of concerns — the same four-layer structure as `@flowiseai/agentflow`. The goal is to keep UI primitives, business logic, API communication, and domain features cleanly separated, so individual features (executions, evaluations, chat history) can be added, tested, and removed without disturbing each other.

```
src/
├── index.ts                    # Public Package API ("Public Face")
│
├── atoms/                      # ⚛️ UI Primitives ("What it looks like" (Dumb))
├── features/                   # 🧩 Domain Features ("What it does" (Smart))
├── core/                       # 🧠 Business Logic ("Business Rules" (Types/Logic))
└── infrastructure/             # 🌐 External Services ("Outside World" (API/Storage))
```

---

## Directory Structure

### `atoms/` - UI Primitives

**"What it looks like."** Tiny, irreducible UI components with no business logic. Shared building blocks used across features.

Example layout (illustrative — not exhaustive; check the directory for the current set):

```
atoms/
├── StatusIndicator.tsx     # Execution / node status icon (INPROGRESS, FINISHED, ERROR…)
├── MetricsDisplay.tsx      # Token / cost / time metrics row
├── NodeIcon.tsx            # AGENTFLOW_ICONS-driven avatar for a node type
├── …                       # Other primitives as the SDK grows
└── index.ts                # Central export
```

**Rules:**

-   Must be "dumb" and stateless (or minimal local state for animations)
-   No business logic
-   No API calls
-   Imported by features, never the reverse
-   **Forbidden**: Importing from `features/` or `infrastructure/` — only `core/types`, `core/theme`, and `core/primitives`

**Goal:** 100% visual consistency across all observe features.

---

### `features/` - Domain Features

**"What it does."** Self-contained domain modules. Each feature owns its components, hooks, and feature-local utilities. Adding a new observability feature (evaluations, chat history, MALT) means adding a new directory here — it does not touch existing feature exports.

Example layout (illustrative — not exhaustive; the `executions` feature currently has more sub-components and hooks than shown here):

```
features/
├── executions/             # Execution viewer
│   ├── components/
│   │   ├── ExecutionsViewer.tsx      # Filterable list + pagination + resizable detail drawer
│   │   ├── ExecutionDetail.tsx       # Resizable split-pane: tree sidebar + node detail
│   │   ├── ExecutionTreeSidebar.tsx  # @mui/x-tree-view RichTreeView with custom slot
│   │   ├── NodeExecutionDetail.tsx   # Step viewer: markdown/JSON/code/HTML renderers, HITL
│   │   ├── ExecutionsListTable.tsx   # Sortable/selectable MUI table
│   │   └── …                         # Other components (chat bubbles, panels) as the feature grows
│   ├── hooks/
│   │   ├── useExecutionPoll.ts       # Auto-poll while INPROGRESS, stop on terminal state
│   │   ├── useExecutionTree.ts       # Build ExecutionTreeNode[] from flat NodeExecutionData[]
│   │   ├── useResizableSidebar.ts    # Drag-to-resize width state (left- or right-anchored panels)
│   │   └── …                         # Other feature-local hooks
│   └── index.ts                      # Public API for this feature
│
└── (evaluations/)          # Future — GA
    └── (chat-history/)     # Future — GA
```

**Rules:**

-   Each feature has an `index.ts` gatekeeper — only re-export what consumers need
-   **Features never import from other features directly** — if two features share logic, move it to `core/`
-   Feature-specific utilities stay in the feature folder
-   Hooks are co-located with their feature

**Goal:** High cohesion. Deleting a feature folder should not break other features.

---

### `core/` - Business Logic

**"The Brain."** Framework-agnostic types, utilities, and the MUI theme factory. No React components, no API calls.

Example layout (illustrative — not exhaustive; new sub-files land under `types/`, `primitives/`, and `utils/` as the SDK grows):

```
core/
├── types/
│   ├── execution.ts        # Execution, ExecutionState, NodeExecutionData,
│   │                       # ExecutionTreeNode, HumanInputParams
│   ├── observe.ts          # ObserveBaseProps, ExecutionsViewerProps,
│   │                       # ExecutionDetailProps, ExecutionFilters
│   ├── nodeDetail.ts       # ChatMessage, ConditionEntry, AvailableToolEntry, …
│   └── index.ts
│
├── primitives/             # Domain-free, safe to import from atoms/
│   ├── agentflowIcons.ts   # AGENTFLOW_ICONS registry (icon + color per node type)
│   ├── json.ts             # JSON tokenizer / safe parser
│   └── index.ts
│
├── utils/                  # Domain-aware helpers — not importable from atoms/
│   ├── guards.ts           # Type predicates over core/types/* shapes
│   ├── tools.ts            # Tool-call extraction / resolution
│   └── index.ts
│
└── theme/
    ├── tokens.ts               # Color palette, spacing, shadows
    ├── createObserveTheme.ts   # MUI theme factory (isDarkMode toggle)
    └── index.ts
```

**Rules:**

-   **No React components** — pure TypeScript only
-   No browser-specific APIs unless unavoidable
-   No side effects
-   Can be tested in isolation

#### `core/primitives/` vs `core/utils/`

-   **`primitives/`** — Domain-free utilities with no knowledge of executions or node data. **Safe to import from `atoms/`.**
-   **`utils/`** — Domain-aware utilities (e.g., execution state helpers). **Only importable by `features/` and `infrastructure/`.**

When adding a utility, ask: _"Does this function need to know what an Execution or NodeExecutionData is?"_ If no → `primitives/`. If yes → `utils/`.

**Goal:** Framework-agnostic source of truth.

---

### `infrastructure/` - External Services

**"The Outside World."** API client factory and React context providers.

Example layout (illustrative — not exhaustive; new API modules land under `api/` as features grow):

```
infrastructure/
├── api/
│   ├── client.ts           # bindApiClient(apiBaseUrl, token) — axios with Bearer header
│   ├── executions.ts       # createExecutionsApi(client): getAllExecutions, getExecutionById,
│   │                       # deleteExecutions, updateExecution
│   └── index.ts
│
└── store/
    └── ObserveContext.tsx  # ObserveProvider, useObserveApi(), useObserveConfig()
```

**Rules:**

-   All external communication goes through `infrastructure/api/`
-   Contexts are internal — composed in `ObserveProvider`, not exported directly to consumers
-   `useObserveApi()` throws if called outside `ObserveProvider` (fast failure)

**Goal:** Wrap external dependencies so they can be mocked in tests.

---

## Dependency Flow

**Dependencies must only flow downwards.**

```
┌─────────────────────────────────────────────────────────┐
│                  Root Files (Public API)                │
│                       (index.ts)                        │
│                   "The Public Face"                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      features/                          │
│   (executions, evaluations, chat-history, …)            │
│                   "What it does"                        │
└─────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌──────────────────┐              ┌────────────────────────┐
│      atoms/      │              │    infrastructure/     │
│  (UI primitives) │              │    (api, store)        │
│ "What it looks   │              │ "The Outside World"    │
│     like"        │              │                        │
└──────────────────┘              └────────────────────────┘
          │                                    │
          └──────────────┬─────────────────────┘
                         ▼
              ┌─────────────────────┐
              │        core/        │
              │  (types, theme,     │
              │   primitives)       │
              │     "The Brain"     │
              └─────────────────────┘
```

**Import Rules:**

-   `features` → `atoms`, `infrastructure`, `core` ✅
-   `infrastructure` → `core` ✅
-   `atoms` → `core/types`, `core/theme`, `core/primitives` only ✅
-   `core` → nothing (leaf node) ✅
-   **No reverse imports** — enforced by ESLint `import/no-restricted-paths`

---

## Observe-Specific Patterns

### `ObserveProvider` — Root Provider

`ObserveProvider` composes three providers:

```tsx
<ThemeProvider theme={createObserveTheme(isDarkMode)}>
    <ObserveApiContext.Provider value={api}>
        <ObserveConfigContext.Provider value={config}>{children}</ObserveConfigContext.Provider>
    </ObserveApiContext.Provider>
</ThemeProvider>
```

-   `ObserveApiContext` — holds the bound axios client (created once from `apiBaseUrl` + `token` + `requestInterceptor`)
-   `ObserveConfigContext` — holds `isDarkMode` and other display config
-   Features call `useObserveApi()` to get the client; they never construct it themselves

### Request Interceptor — Auth Bridging

The SDK sends `Authorization: Bearer <token>` by default. Different consumers authenticate differently:

| Consumer                     | Auth mechanism                              | How to configure                                       |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| DevSite                      | AgentForge proxy headers                    | `requestInterceptor` to inject proxy token             |
| OSS (embedded in Flowise UI) | Session cookie + `x-request-from: internal` | `requestInterceptor` to set `withCredentials` + header |
| OSS (standalone / external)  | Flowise API key                             | `token` prop (default)                                 |

`requestInterceptor` is a callback on the Axios request config, identical in shape to the one in `@flowiseai/agentflow`:

```ts
interface ObserveBaseProps {
    requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
}
```

It is passed to `bindApiClient` and registered via `axios.interceptors.request.use`. If the callback throws, the error is caught, logged, and the original unmodified config is used so the request still proceeds safely.

**OSS session auth example:**

```tsx
<ObserveProvider
    apiBaseUrl='http://localhost:3000'
    requestInterceptor={(config) => {
        config.withCredentials = true
        config.headers['x-request-from'] = 'internal'
        return config
    }}
>
    <ExecutionsViewer agentflowId='...' />
</ObserveProvider>
```

`requestInterceptor` should only be provided by trusted, developer-authored code — never from user input or dynamically evaluated strings.

### Auto-Poll (`useExecutionPoll`)

`useExecutionPoll` sets up a `setInterval` while `execution.state === 'INPROGRESS'`:

```
INPROGRESS → polls every pollInterval ms
FINISHED | ERROR | TERMINATED | TIMEOUT | STOPPED → interval cleared immediately
```

-   `pollInterval={0}` disables auto-poll entirely
-   `refresh()` is returned for manual refresh buttons
-   The hook clears the interval on unmount

### Execution Tree (`useExecutionTree`)

`useExecutionTree` converts the flat `NodeExecutionData[]` stored as JSON in `execution.executionData` into a hierarchical `ExecutionTreeNode[]`. Two parenting mechanisms run in sequence (mirrors legacy `ExecutionDetails.jsx` `buildTreeData`):

1. **`previousNodeIds` parent→child** — each non-iteration node attaches to the most-recent prior instance of any node listed in its `previousNodeIds`. Nodes with empty / unmatched `previousNodeIds` become roots. The "most recent" rule disambiguates when the same `nodeId` runs more than once (e.g. inside a loop).
2. **Iteration grouping** — children with `parentNodeId` + `iterationIndex` are bundled into virtual `Iteration #N` container nodes (`isVirtualNode: true`) under the iteration agent's most-recent instance, then linked to one another inside the iteration via the same `previousNodeIds` rule (restricted to same-iteration siblings).

Tree-node ids are `${nodeId}_${arrayIndex}` so duplicate `nodeId`s remain addressable. The tree is consumed by `ExecutionTreeSidebar` (a `RichTreeView` slot) inside `ExecutionDetail`.

### HITL Callback — Opaque Consumer Contract

The `onHumanInput` prop is intentionally opaque:

```ts
interface ExecutionsViewerProps {
    onHumanInput?: (agentflowId: string, params: HumanInputParams) => Promise<void>
}
```

-   In OSS: consumer calls the Flowise prediction endpoint directly
-   In DevSite: consumer routes through the AgentForge proxy

The SDK never calls the prediction API itself. Approve/Reject buttons are only rendered when `onHumanInput` is provided AND the node is a human input node in INPROGRESS state. This keeps auth and routing logic entirely out of the SDK.

### Tenant Isolation

Tenant isolation is handled server-side by Flowise's `ExtendRequestContextMiddleware` via request headers. The SDK does not accept or pass a `tenantId` prop — the API returns only what the authenticated token is permitted to see.

---

## Gatekeeper Pattern

Each module exposes only what's needed via its `index.ts`:

```typescript
// features/executions/index.ts (illustrative — re-export only what consumers need)
// ✅ Public API
export { ExecutionsViewer } from './components/ExecutionsViewer'
export { ExecutionDetail } from './components/ExecutionDetail'
export { NodeExecutionDetail } from './components/NodeExecutionDetail'
export { useExecutionPoll } from './hooks/useExecutionPoll'
export { useExecutionTree } from './hooks/useExecutionTree'

// ❌ Internal sub-components (e.g. ExecutionTreeSidebar, ChatMessageBubble) and helpers stay private
```

---

## Adding a New Feature

Adding evaluations, chat history, or MALT follows the same pattern:

1. Create a folder under `features/`:

    ```
    features/evaluations/
    ├── components/
    │   └── EvaluationsViewer.tsx
    ├── hooks/
    │   └── useEvaluationPoll.ts
    └── index.ts
    ```

2. Add the API module under `infrastructure/api/`:

    ```
    infrastructure/api/
    └── evaluations.ts   # createEvaluationsApi(client)
    ```

3. Add any new types to `core/types/` (e.g., `evaluation.ts`)

4. Export only from the feature's `index.ts`, then re-export from the package `src/index.ts`

5. Import from infrastructure/core, never from other features:

    ```typescript
    // ✅ Good
    import { useObserveApi } from '../../../infrastructure/store'
    import type { Execution } from '../../../core/types'

    // ❌ Bad — cross-feature import
    import { ExecutionDetail } from '../executions/components/ExecutionDetail'
    ```

---

## Root Files (`src/index.ts`)

The barrel export exposes only the public surface. Example shape (illustrative — refer to `src/index.ts` for the current set):

```typescript
// Components
export { ExecutionsViewer, ExecutionDetail, NodeExecutionDetail } from './features/executions'
export { ObserveProvider } from './infrastructure/store'

// Hooks (for consumers building custom UIs on top of observe infrastructure)
export { useExecutionPoll, useExecutionTree } from './features/executions'
export { useObserveApi, useObserveConfig } from './infrastructure/store'

// Types
export type { ExecutionsViewerProps, ExecutionDetailProps, ExecutionFilters } from './core/types'
export type { Execution, ExecutionState, NodeExecutionData, HumanInputParams, AgentflowRef } from './core/types'
```

Everything else is internal implementation detail.

---

## Development Principles

### Barrel Exports

Every directory has an `index.ts` gatekeeper.

**✅ Good:**

```typescript
import { StatusIcon } from '../../atoms'
import { useObserveApi } from '../../infrastructure/store'
```

**❌ Bad:**

```typescript
// Never deep-link into files
import { StatusIcon } from '../../atoms/StatusIcon'
import { useObserveApi } from '../../infrastructure/store/ObserveContext'
```

### Naming Conventions

| Type        | Convention                  | Example                      |
| ----------- | --------------------------- | ---------------------------- |
| Component   | PascalCase.tsx              | `ExecutionDetail.tsx`        |
| Hook        | camelCase.ts (`use` prefix) | `useExecutionPoll.ts`        |
| Logic/Types | camelCase.ts                | `execution.ts`, `observe.ts` |
| API module  | camelCase.ts                | `executions.ts`              |
| Styles      | kebab-case (co-located)     | `executions.css`             |

### Theme Token Ordering

Inside `core/theme/tokens.ts`, all maps are ordered alphanumerically: `baseColors`, top-level `tokens` groups, subgroups, and keys (e.g. `gray50 < gray75 < gray100 < gray200`). Each `{ dark, light }` / `{ dark, light, main }` pair follows the same rule. Keep new entries in order so diffs stay small.

### Type Location Rule

Domain types live in `core/types/`, **not** alongside their primary component, when they cross any of these boundaries:

-   Imported by a hook (`features/*/hooks/*`)
-   Imported by another component in a different file
-   Used in a public API exported via `src/index.ts`

Component-internal types (props interfaces, file-private shapes used only inside the file that defines the component) stay co-located. The rule prevents the inversion where a hook reaches "upward" into a sibling component file just to read a type.

Props interfaces (e.g. `ChatMessageBubbleProps`) are **always** file-local — never lift them to `core/types/` even if another component would re-use one. Re-using a props interface across components is a code smell on its own; the right fix is a shared underlying type, not a shared props interface.

Predicates that narrow into a `core/types/` shape (e.g. `isChatMessageArray(value): value is ChatMessage[]`) live in `core/utils/` next to other domain-aware helpers — never in `atoms/` (atoms cannot import from `core/utils`, only from `core/primitives`).

Example layout:

-   `core/types/nodeDetail.ts` — `ChatMessage`, `ConditionEntry`, `AvailableToolEntry`, `UsedToolEntry`, `UsedToolRef`, `ToolNodeRef`, `NormalizedToolCall`
-   `core/utils/guards.ts` — `isChatMessageArray`, `isConditionArray`, `isAvailableToolArray`, `isUsedToolArray`
-   `core/utils/tools.ts` — `resolveTool`, `extractToolCalls` (consumed by `ChatMessageBubble` + `ToolAccordionList`)
