# @flowiseai/observe

[![Version](https://img.shields.io/npm/v/@flowiseai/observe)](https://www.npmjs.com/package/@flowiseai/observe)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md)

> Embeddable React components for visualizing AI agent runtime observability — executions, evaluations, and more

## ⚠️ Status

**This package is currently under active development.**

-   🚧 Components are not yet fully functional
-   ❌ End-to-end functionality is not complete
-   🔄 Features are still being implemented and tested
-   ⚡ APIs may change before stable release
-   📝 Documentation is being updated as development progresses

**Cannot be used in production. For development and testing purposes only.**

## Overview

`@flowiseai/observe` is the runtime observability SDK for Flowise. It provides embeddable React components for viewing execution traces, node-level step details, and human-in-the-loop interactions for AI agent workflows built with Flowise.

This is the "Observe" layer of the Build-Run-Observe trio alongside `@flowiseai/agentflow` (Build).

## Features

-   **Execution List** — Filterable, paginated table of agent executions across all agentflows, or scoped to a single agentflow via `agentflowId`
-   **Execution Detail** — Resizable split-pane with a sidebar node tree and a right-side step viewer
-   **Node Step Viewer** — Renders markdown, JSON, raw code, and HTML output per node step, with rendered/raw toggle
-   **Token / Cost / Time Metrics** — Per-node execution metrics displayed inline
-   **Auto-Poll** — Automatically refreshes while a run is `INPROGRESS`, stops on terminal state
-   **HITL Support** — Approve/Reject buttons for human-input nodes when `onHumanInput` callback is provided
-   **State + Date Filters** — Filter by execution state and date range
-   **Single-Row and Bulk Delete** — Opt-in trash icon on row hover, plus bulk delete via checkbox selection
-   **Dark Mode** — Full light/dark theme support via design tokens and CSS variables
-   **SDK-Owned Theme** — No host theme required; `ObserveProvider` injects its own MUI theme

## Installation

```bash
pnpm add @flowiseai/observe
```

**Peer Dependencies:**

```bash
pnpm add react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled
```

> Note: ReactFlow is **not** a peer dependency. `@flowiseai/observe` is a viewer only — no canvas.

## Basic Usage

### Execution List

Displays all executions across every agentflow. Pass `agentflowId` to scope the list to a single flow — useful when embedding next to a specific agentflow canvas.

```tsx
import { ExecutionsViewer, ObserveProvider } from '@flowiseai/observe'

export default function App() {
    return (
        <ObserveProvider apiBaseUrl='http://localhost:3000' token='your-api-key'>
            {/* All agentflows */}
            <ExecutionsViewer allowDelete={true} pollInterval={3000} />

            {/* Scoped to one agentflow */}
            <ExecutionsViewer agentflowId='uuid-of-the-agentflow' allowDelete={true} pollInterval={3000} />
        </ObserveProvider>
    )
}
```

### Standalone Execution Detail

Renders the full step viewer for a single execution by ID — useful for deep-linking into a specific trace.

```tsx
import { ExecutionDetail, ObserveProvider } from '@flowiseai/observe'

export default function App() {
    return (
        <ObserveProvider apiBaseUrl='http://localhost:3000' token='your-api-key'>
            <ExecutionDetail executionId='uuid-of-the-execution' pollInterval={3000} />
        </ObserveProvider>
    )
}
```

### With HITL Callback

The `onHumanInput` callback is how the host application handles human-in-the-loop responses. The SDK delegates routing entirely to the consumer — OSS calls Flowise directly, DevSite routes through the AgentForge proxy.

```tsx
<ExecutionsViewer
    onHumanInput={async (agentflowId, params) => {
        // OSS: call Flowise prediction endpoint directly
        await fetch(`/api/v1/prediction/${agentflowId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(params.humanInput)
        })
        // DevSite: route through AgentForge proxy instead
    }}
/>
```

When `onHumanInput` is not provided, Approve/Reject buttons are not rendered. No auth complexity leaks into the SDK.

### With Request Interceptor

`token` and `requestInterceptor` are both optional and compose: if both are provided, the Bearer header is set first, then the interceptor runs and can extend or override it.

**API key (default):**

```tsx
// token alone — sets Authorization: Bearer header automatically
<ObserveProvider apiBaseUrl='http://localhost:3000' token='your-api-key'>
    {/* your app */}
</ObserveProvider>
```

**OSS session auth** — embedding inside the Flowise UI where a session cookie already exists:

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

**DevSite proxy auth** — inject AgentForge proxy headers:

```tsx
<ObserveProvider
    apiBaseUrl='https://...'
    requestInterceptor={(config) => {
        config.headers['x-agentforge-token'] = getProxyToken()
        return config
    }}
>
    {/* your app */}
</ObserveProvider>
```

If the interceptor throws, the error is caught, logged, and the original unmodified config is used so the request still proceeds. Only pass trusted, developer-authored functions — never user-generated input.

## Props

### `<ObserveProvider>`

Root provider. Wraps `ExecutionsViewer` or `ExecutionDetail`. Injects the MUI theme, API client, and config context.

<!-- prettier-ignore -->
| Prop                  | Type                                                                      | Default        | Description                                                                                   |
| --------------------- | ------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------- |
| `apiBaseUrl`          | `string`                                                                  | **(required)** | Flowise API server base URL                                                                   |
| `token`               | `string`                                                                  | —              | API key — sets `Authorization: Bearer <token>`. Optional when using `requestInterceptor`. |
| `requestInterceptor`  | `(config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig`     | —              | Customize outgoing requests. Runs after Bearer header is set — can extend or override it. See [Request Interceptor](#with-request-interceptor) below. |
| `isDarkMode`          | `boolean`                                                                 | `false`        | Use dark mode theme                                                                           |
| `children`            | `ReactNode`                                                               | **(required)** | `ExecutionsViewer`, `ExecutionDetail`, or both                                                |

### `<ExecutionsViewer>`

Filterable, paginated list of executions. Clicking a row opens `ExecutionDetail` in a side drawer. Must be rendered inside `<ObserveProvider>`.

<!-- prettier-ignore -->
| Prop             | Type                                                                | Default | Description                                                                         |
| ---------------- | ------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `agentflowId`    | `string`                                                            | —       | Scope list to a single agentflow. Omit for full cross-agent list.                   |
| `allowDelete`    | `boolean`                                                           | `false` | Show trash icon on row hover with inline confirm dialog                             |
| `pollInterval`   | `number`                                                            | `3000`  | Auto-poll interval in ms while any execution is INPROGRESS. `0` = off              |
| `initialFilters` | `Partial<ExecutionFilters>`                                         | —       | Pre-set filter values on mount                                                      |
| `onHumanInput`   | `(agentflowId: string, params: HumanInputParams) => Promise<void>` | —       | HITL callback. Approve/Reject buttons hidden when not provided                      |

### `<ExecutionDetail>`

Resizable split-pane viewer for a single execution. Left sidebar shows the node tree; right panel shows `NodeExecutionDetail` for the selected step. Must be rendered inside `<ObserveProvider>`.

<!-- prettier-ignore -->
| Prop           | Type                                                                | Default        | Description                                                        |
| -------------- | ------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `executionId`  | `string`                                                            | **(required)** | UUID of the execution to display                                   |
| `pollInterval` | `number`                                                            | `3000`         | Auto-poll interval in ms while execution is INPROGRESS. `0` = off |
| `onHumanInput` | `(agentflowId: string, params: HumanInputParams) => Promise<void>` | —              | HITL callback. Approve/Reject buttons hidden when not provided     |
| `onClose`      | `() => void`                                                        | —              | Called when the panel is dismissed (dismissible contexts only)     |

### Auto-Poll Behavior

Both `ExecutionsViewer` and `ExecutionDetail` auto-refresh while `state === 'INPROGRESS'`:

```
INPROGRESS → polls every pollInterval ms
FINISHED | ERROR | TERMINATED | TIMEOUT | STOPPED → polling stops immediately
```

Set `pollInterval={0}` to disable auto-poll and rely on the manual refresh button only.

### Deletion

Opt-in via `allowDelete={true}` on `ExecutionsViewer`. Shows a trash icon on row hover. Clicking opens an inline confirm dialog. The SDK calls `DELETE /api/v1/executions` internally on confirm.

> Bulk delete is available via checkbox selection in the table header.

## Types

```typescript
type ExecutionState = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'TERMINATED' | 'TIMEOUT' | 'STOPPED'

interface Execution {
    id: string
    executionData: string // JSON-serialized NodeExecutionData[]
    state: ExecutionState
    agentflowId: string
    sessionId?: string
    isPublic: boolean
    createdDate: string
    updatedDate: string
    agentflow?: { id: string; name: string }
}

interface NodeExecutionData {
    nodeLabel: string
    nodeId: string
    data: unknown // rendered content (markdown string, object, etc.)
    previousNodeIds: string[]
    status: ExecutionState
    name?: string
    iterationIndex?: number
    parentNodeId?: string
    output?: unknown
}

interface HumanInputParams {
    question: string
    chatId: string
    humanInput: {
        type: 'proceed' | 'reject'
        startNodeId: string
        feedback?: string
    }
}

interface ExecutionFilters {
    state: ExecutionState | ''
    startDate: string
    endDate: string
    sessionId: string
    agentflowName: string // M2 only
}
```

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run examples dev server
cd examples && pnpm install && pnpm dev
```

Copy `examples/.env.example` to `examples/.env` and fill in your values before running the dev server.

Visit the [examples](./examples/README.md) directory for usage demos. See [ARCHITECTURE.md](./ARCHITECTURE.md) for internal structure and design patterns.

## Publishing

### Version Update

```bash
# Prerelease (for testing / EA)
npm version prerelease --preid=dev   # 0.0.0-dev.1 → 0.0.0-dev.2

# Patch / Minor / Major (stable)
npm version patch                    # 0.0.1
npm version minor                    # 0.1.0
npm version major                    # 1.0.0
```

### Verify Before Publishing

```bash
pnpm build
npm pack --dry-run
npm publish --dry-run
```

### Publish

```bash
# EA / prerelease — tagged so npm install won't pick it up by default
npm publish --tag dev

# Stable release
npm publish
```

> The `prepublishOnly` script runs `clean` and `build` automatically before every publish.

## Documentation

-   [ARCHITECTURE.md](./ARCHITECTURE.md) — Internal architecture, layer rules, and patterns
-   [Examples](./examples/README.md) — Running the demo app

## License

Apache-2.0 — see the repository root [LICENSE.md](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md) for details.

---

Part of the [Flowise](https://github.com/FlowiseAI/Flowise) ecosystem
