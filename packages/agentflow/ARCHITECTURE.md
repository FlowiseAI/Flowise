# @flowise/agentflow - Architecture

This document describes the internal architecture of the `@flowise/agentflow` package.

## Overview

The package follows a **Domain-Driven Modular Architecture** with clear separation of concerns. The goal is to separate low-level UI primitives from high-level business logic to ensure high reusability and easy testing.

```
src/
├── index.ts                    # Public Package API ("Public Face")
├── Agentflow.tsx               # Main component
├── AgentflowProvider.tsx       # Root provider (composition)
├── useAgentflow.ts             # Primary public hook
│
├── atoms/                      # ⚛️ UI Primitives ("What it looks like" (Dumb))
├── features/                   # 🧩 Domain Features ("What it does" (Smart))
├── core/                       # 🧠 Business Logic ("Business Rules" (Types/Logic))
└── infrastructure/             # 🌐 External Services ("Outside World" (API/Storage))
```

---

## Directory Structure

### `atoms/` - UI Primitives

**"What it looks like."** Tiny, irreducible UI components with no business logic. These are the building blocks used by features.

```
atoms/
├── MainCard.tsx            # Styled card wrapper
├── Input.tsx               # Basic input component
├── ConfirmDialog.tsx       # Confirmation dialog with context
├── NodeInputHandler.tsx    # Form input for node properties
└── index.ts                # Central export
```

**Rules:**

-   Must be "dumb" and stateless
-   No business logic
-   No API calls
-   Stateless or minimal local state
-   Imported by features, never the reverse
-   **Forbidden**: Importing from `features/` or `infrastructure/` (except types from `core/types` for prop definitions)

**Goal:** 100% visual consistency.

---

### `features/` - Domain Features

**"What it does."** Complex, self-contained domain modules (silos) that house the application's core functionality. Each feature owns its components, hooks, and utilities.

```
features/
├── canvas/                 # Core ReactFlow canvas
│   ├── containers/         # Smart components with state/logic
│   │   ├── AgentFlowNode.tsx
│   │   ├── AgentFlowEdge.tsx
│   │   ├── StickyNote.tsx
│   │   ├── IterationNode.tsx
│   │   └── index.ts
│   ├── components/         # Presentational components
│   │   ├── AgentflowHeader.tsx
│   │   ├── ConnectionLine.tsx
│   │   ├── NodeToolbarActions.tsx
│   │   ├── NodeStatusIndicator.tsx
│   │   ├── NodeInfoDialog.tsx
│   │   ├── NodeModelConfigs.tsx
│   │   └── index.ts
│   ├── hooks/              # Canvas-related hooks
│   │   ├── useFlowNodes.ts
│   │   ├── useFlowHandlers.ts
│   │   ├── useDragAndDrop.ts
│   │   └── index.ts
│   ├── styled.ts           # Styled components
│   ├── nodeIcons.tsx       # Icon utilities
│   ├── canvas.css          # Co-located styles
│   └── index.ts            # Public API
│
├── node-palette/           # Add nodes drawer
│   ├── AddNodesDrawer.tsx
│   ├── StyledFab.tsx
│   ├── search.ts           # Feature-specific utility (private)
│   └── index.ts            # Exports: AddNodesDrawer, StyledFab
│
├── generator/              # AI flow generation
│   ├── GenerateFlowDialog.tsx
│   ├── SuggestionChips.tsx
│   └── index.ts            # Exports: GenerateFlowDialog
│
└── node-editor/            # Node property editing
    ├── EditNodeDialog.tsx
    └── index.ts            # Exports: EditNodeDialog
```

**Rules:**

-   Each feature has an `index.ts` gatekeeper
-   **Features never import from other features directly** - If `canvas` needs logic from `generator`, move that logic to `core/`
-   Feature-specific utils stay in the feature folder
-   Styles are co-located with their feature
-   Use `containers/` for smart components (with state, hooks, side effects)
-   Use `components/` for presentational components (props in, JSX out)

**Goal:** High cohesion. Should be able to delete a feature folder without breaking others.

---

### `core/` - Business Logic

**"The Brain."** Framework-agnostic logic, types, and utilities. No React, no UI - pure TypeScript. Contains validation schemas, node registries, domain constants, and shared types.

```
core/
├── types/                  # Global interfaces (Node, Edge, Flow)
│   └── index.ts
├── node-config/            # Node configuration (icons, colors, default types)
│   ├── nodeIcons.ts        # AGENTFLOW_ICONS, DEFAULT_AGENTFLOW_NODES
│   ├── nodeIconUtils.ts    # getAgentflowIcon, getNodeColor
│   └── index.ts
├── node-catalog/           # Node catalog and filtering logic
│   ├── nodeFilters.ts      # filterNodesByComponents, isAgentflowNode, groupNodesByCategory
│   └── index.ts
├── validation/             # Flow validation logic
│   ├── flowValidation.ts   # validateFlow, validateNode
│   └── index.ts
├── utils/                  # Generic utilities
│   ├── nodeFactory.ts      # initNode, getUniqueNodeId, getUniqueNodeLabel
│   ├── connectionValidation.ts # isValidConnectionAgentflowV2
│   ├── flowExport.ts       # generateExportFlowData
│   └── index.ts
└── index.ts                # Barrel export (use sparingly)
```

**Rules:**

-   **No React components allowed** - Pure TypeScript only
-   No browser-specific APIs if possible
-   No side effects
-   Pure functions where possible
-   Can be tested in isolation

**Goal:** To be the framework-agnostic source of truth.

---

### `infrastructure/` - External Services

**"The Outside World."** Handles communication with external systems: data persistence, network requests, and global state management.

```
infrastructure/
├── api/                    # API client layer (network requests)
│   ├── client.ts           # Axios factory
│   ├── nodes.ts            # Nodes API endpoints
│   ├── chatflows.ts        # Chatflows API endpoints
│   ├── hooks/
│   │   └── useApi.ts       # API hook (co-located)
│   └── index.ts
│
└── store/                  # State management
    ├── ApiContext.tsx      # API client context
    ├── ConfigContext.tsx   # Configuration context
    ├── AgentflowContext.tsx # Flow state context
    ├── useFlowInstance.ts  # ReactFlow instance hook
    └── index.ts
```

**Rules:**

-   All external communication goes here
-   Contexts are internal (composed in AgentflowProvider)
-   API hooks live with their API modules

**Goal:** To wrap external dependencies so they can be easily swapped or mocked in tests.

---

## Dependency Flow

**Dependencies must only flow downwards.**

```
┌─────────────────────────────────────────────────────────┐
│                  Root Files (Public API)                │
│    (index.ts, Agentflow.tsx, AgentflowProvider.tsx)     │
│                   "The Public Face"                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      features/                          │
│   (canvas, node-palette, generator, node-editor)        │
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
              │  (types, constants, │
              │   validation, etc.) │
              │     "The Brain"     │
              └─────────────────────┘
```

**Import Rules:**

-   `features` → `atoms`, `infrastructure`, `core` ✅
-   `infrastructure` → `core` ✅
-   `atoms` → `core/types` only (for type definitions) ✅
-   `core` → nothing (leaf node) ✅
-   **Atoms and Core are "leaf" nodes** - they cannot import from `features/` or `infrastructure/`

---

## Gatekeeper Pattern

Each module exposes only what's needed via its `index.ts`:

```typescript
// features/canvas/index.ts
// ✅ Public API
export const nodeTypes = { ... }
export const edgeTypes = { ... }
export { ConnectionLine, AgentflowHeader, createHeaderProps }
export { useFlowNodes, useFlowHandlers, useDragAndDrop }

// Container components are re-exported for advanced usage
export { AgentFlowNode, AgentFlowEdge, StickyNote, IterationNode }

// ❌ Internal sub-components stay private within containers/components
```

This enables:

-   **Encapsulation**: Internal refactoring doesn't break consumers
-   **Tree-shaking**: Bundlers can eliminate unused code
-   **Clarity**: Clear contract of what each module provides

---

## Adding a New Feature

1. Create folder under `features/`:

    ```
    features/my-feature/
    ├── containers/         # Smart components (optional)
    │   └── MyContainer.tsx
    ├── components/         # Presentational components (optional)
    │   └── MyComponent.tsx
    ├── hooks/              # Feature-specific hooks (optional)
    │   └── useMyHook.ts
    ├── helper.ts           # Feature-specific util
    └── index.ts            # Public exports only
    ```

2. Export only what's needed:

    ```typescript
    // index.ts
    export { MyContainer } from './containers'
    export { MyComponent } from './components'
    export { useMyHook } from './hooks'
    export type { MyComponentProps } from './components'
    ```

3. Import from infrastructure/core, never from other features:

    ```typescript
    // ✅ Good
    import { useApiContext } from '../../infrastructure/store'
    import type { NodeData } from '../../core/types'

    // ❌ Bad - cross-feature import
    import { AgentFlowNode } from '../canvas/containers/AgentFlowNode'
    ```

---

## Root Files (`src/*.ts`)

**"The Public Face."** The entry point of the package.

-   **`AgentflowProvider.tsx`**: Injects infrastructure (stores/api) into the app
-   **`Agentflow.tsx`**: The primary component users will drop into their apps
-   **`useAgentflow.ts`**: Primary public hook for accessing flow state and actions
-   **`index.ts`**: The "Barrel" that exports the public API for npm

---

## Public API

The package exposes a minimal public API via `src/index.ts`:

```typescript
// Components
export { Agentflow } from './Agentflow'
export { AgentflowProvider } from './AgentflowProvider'

// Hooks
export { useAgentflow } from './useAgentflow'
export { useApiContext, useConfigContext, useAgentflowContext } from './infrastructure/store'

// Types
export type { AgentflowProps, FlowData, NodeData, ... } from './core/types'

// Utilities (for advanced usage)
export { AGENTFLOW_ICONS, validateFlow, ... } from './core/...'
```

Everything else is internal implementation detail.

---

## Development Principles

### Barrel Exports

Every directory must have an `index.ts` that acts as a gatekeeper.

**✅ Good:**

```typescript
import { Button } from '@atoms'
import { useFlowHandlers } from '@features/canvas'
```

**❌ Bad:**

```typescript
// Never deep-link into files
import { Button } from '@atoms/Button/Button'
import { useFlowHandlers } from '@features/canvas/hooks/useFlowHandlers'
```

### Prop Drilling vs. Context

-   **Atoms**: Use props for all configuration
-   **Features**: Use context/state for shared data

### Naming Convention

| Type        | Convention                | Example                               |
| ----------- | ------------------------- | ------------------------------------- |
| Component   | PascalCase.tsx            | `AgentFlowNode.tsx`                   |
| Hook        | camelCase.ts (use prefix) | `useFlowInstance.ts`                  |
| Logic/Types | camelCase.ts              | `flowValidation.ts`, `nodeFilters.ts` |
| Styles      | kebab-case (co-located)   | `canvas.css`                          |
