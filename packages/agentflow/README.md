# @flowiseai/agentflow

[![Version](https://img.shields.io/npm/v/@flowiseai/agentflow)](https://www.npmjs.com/package/@flowiseai/agentflow)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md)

> Embeddable React component for building and visualizing AI agent workflows

## Status: Dev

**Current version: `0.0.0-dev.13`**

This package is functional and has comprehensive test coverage, but the public API may still change before a stable release. It is suitable for early integration and testing but not yet recommended for production use.

**What works today:**

-   13 node types with full editing support (Loop and Human Input nodes are present in the palette but not yet fully verified end-to-end)
-   Connection validation, flow validation, and export
-   Async option loading (models, credentials, tools)
-   Variable picker and field visibility conditions
-   AI flow generation from natural language
-   Dark/light mode theming
-   Read-only mode and custom rendering via render props

## Overview

`@flowiseai/agentflow` is a React-based flow editor for creating AI agent workflows. It provides a visual canvas built on ReactFlow for connecting AI agents, LLMs, tools, and logic nodes.

## Features

-   **Visual Canvas** — Drag-and-drop flow editor built on ReactFlow with zoom, pan, minimap, and fit-to-view controls
-   **13 Built-in Node Types** — Start, Agent, LLM, Condition, Condition Agent, Direct Reply, Custom Function, Tool, Retriever, Sticky Note, HTTP, Iteration, and Execute Flow
-   **Node Editor Dialog** — Modal for editing node parameters with dynamic input types (text, number, boolean, dropdown, arrays, JSON, code, variable selector, async options)
-   **Credential Management** — Create and edit credentials inline from the node editor
-   **Rich Text Editor** — TipTap-based editor with syntax highlighting for JavaScript, TypeScript, Python, and JSON (lazy-loaded)
-   **Specialized Input Components** — Condition builder, messages input (role + content), and structured output schema builder
-   **AI Flow Generator** — Generate flows from natural language descriptions with model selection
-   **Flow Validation** — Detects empty flows, missing start nodes, disconnected nodes, cycles, hanging edges, and per-node input errors with visual feedback
-   **Dark Mode** — Full light/dark theme support via design tokens and CSS variables
-   **Read-Only Mode** — Disable editing for view-only embedding
-   **Custom Rendering** — Replace the default header and node palette with your own components via render props
-   **Imperative API** — Programmatic control via ref (`getFlow`, `validate`, `fitView`, `clear`, `addNode`, `toJSON`)
-   **Request Interceptor** — Customize outgoing API requests (headers, credentials) via an Axios interceptor callback
-   **Keyboard Shortcuts** — Cmd/Ctrl+S to save

## Installation

```bash
pnpm add @flowiseai/agentflow
```

**Peer Dependencies:**

```bash
pnpm add react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled reactflow
```

## Basic Usage

```tsx
import { Agentflow } from '@flowiseai/agentflow'

import '@flowiseai/agentflow/flowise.css'

export default function App() {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Agentflow apiBaseUrl='http://localhost:3000' token='your-api-key' />
        </div>
    )
}
```

### With Initial Flow Data and Callbacks

```tsx
import { useRef } from 'react'

import { Agentflow, type AgentFlowInstance, type FlowData } from '@flowiseai/agentflow'

import '@flowiseai/agentflow/flowise.css'

export default function App() {
    const ref = useRef<AgentFlowInstance>(null)

    const initialFlow: FlowData = {
        nodes: [
            {
                id: 'startAgentflow_0',
                type: 'agentflowNode',
                position: { x: 100, y: 100 },
                data: {
                    id: 'startAgentflow_0',
                    name: 'startAgentflow',
                    label: 'Start',
                    color: '#7EE787',
                    hideInput: true,
                    outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
                }
            }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
    }

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Agentflow
                ref={ref}
                apiBaseUrl='http://localhost:3000'
                token='your-api-key'
                initialFlow={initialFlow}
                onFlowChange={(flow) => console.log('Flow changed:', flow)}
                onSave={(flow) => console.log('Flow saved:', flow)}
            />
        </div>
    )
}
```

### More Examples

The [examples app](./examples/README.md) includes working demos for:

-   **Variable usage** — `{{variable}}` syntax, variable picker, available sources
-   **Async options** — Loading models, tools, and credentials from the API
-   **Status indicators** — Node execution states (running, finished, error, stopped)
-   **Field visibility** — Show/hide conditions on node inputs
-   **State management** — Dirty tracking, flow change callbacks
-   **Dark mode** — Light/dark theme toggle
-   **Custom UI** — Custom header and node palette via render props
-   **Filtered components** — Restricting available node types with presets
-   **Validation actions** — Validation button, error display, and custom `canvasActions` alongside built-in controls

Run `cd examples && npm install && npm run dev` to try them locally.

## Props

<!-- prettier-ignore -->
| Prop                 | Type                                       | Default        | Description                                                     |
| -------------------- | ------------------------------------------ | -------------- | --------------------------------------------------------------- |
| `apiBaseUrl`         | `string`                                   | **(required)** | Flowise API server endpoint                                     |
| `token`              | `string`                                   | —              | Authentication token for API calls                              |
| `requestInterceptor` | `(config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig` | — | Customize outgoing API requests (e.g., set `withCredentials`, add headers). The callback receives the full Axios request config — only modify what you need. See [Security: requestInterceptor](#security-requestinterceptor) below. |
| `initialFlow`        | `FlowData`                                 | —              | Initial flow data to render (uncontrolled — only used on mount) |
| `flowId`             | `string`                                   | —              | Flow identifier (reserved for future use)                       |
| `components`         | `string[]`                                 | —              | Restrict which node types appear in the palette                 |
| `onFlowChange`       | `(flow: FlowData) => void`                 | —              | Called when the flow changes (node/edge add, remove, move)      |
| `onSave`             | `(flow: FlowData) => void`                 | —              | Called when the user triggers a save                            |
| `onFlowGenerated`    | `(flow: FlowData) => void`                 | —              | Called when a flow is generated via AI                          |
| `isDarkMode`         | `boolean`                                  | `false`        | Use dark mode theme                                             |
| `readOnly`           | `boolean`                                  | `false`        | Disable editing (nodes not draggable/connectable)               |
| `showDefaultHeader`  | `boolean`                                  | `true`         | Show built-in header (ignored if `renderHeader` provided)       |
| `showDefaultPalette` | `boolean`                                  | `true`         | Show built-in node palette                                      |
| `enableGenerator`    | `boolean`                                  | `true`         | Show the AI flow generator button                               |
| `canvasActions`      | `ReactNode`                                | —              | Additional content rendered in the top-right canvas overlay, to the right of the built-in validation FAB. Hidden when `readOnly` is true. |
| `renderHeader`       | `(props: HeaderRenderProps) => ReactNode`  | —              | Custom header renderer                                          |
| `renderNodePalette`  | `(props: PaletteRenderProps) => ReactNode` | —              | Custom node palette renderer                                    |

### Imperative Methods (via `ref`)

| Method                   | Return Type               | Description                           |
| ------------------------ | ------------------------- | ------------------------------------- |
| `getFlow()`              | `FlowData`                | Get current flow data                 |
| `toJSON()`               | `string`                  | Export flow as JSON string            |
| `validate()`             | `ValidationResult`        | Validate the current flow             |
| `fitView()`              | `void`                    | Fit all nodes into view               |
| `clear()`                | `void`                    | Remove all nodes and edges            |
| `addNode(nodeData)`      | `void`                    | Add a node (`Partial<FlowNode>`)      |
| `getReactFlowInstance()` | `ReactFlowInstance\|null` | Get the underlying ReactFlow instance |

### Security: `requestInterceptor`

The `requestInterceptor` callback runs inside the Axios request pipeline and has access to the full request configuration, including authentication headers. This is the same trust model as any other callback prop (e.g., `onSave`, `renderHeader`) — the host application developer supplies the function and is responsible for its behavior.

**Guidelines for consumers:**

-   Only pass **trusted, developer-authored** functions. Never use dynamically evaluated code (`eval`, `new Function`, etc.) or user-generated input as the interceptor.
-   Follow the **principle of least privilege** — only read or modify the specific config properties you need (e.g., `withCredentials`, custom headers).
-   If the interceptor throws, the error is caught, logged, and the **original unmodified config** is used so the request still proceeds safely.

### Node Types

The following node types are available in the palette by default. Use the `components` prop to restrict which types are shown.

<!-- prettier-ignore -->
| Node Type                  | Description                          |
| -------------------------- | ------------------------------------ |
| `startAgentflow`           | Entry point (required, always shown) |
| `agentAgentflow`           | AI agent execution                   |
| `llmAgentflow`             | LLM / language model call            |
| `conditionAgentflow`       | Conditional branching                |
| `conditionAgentAgentflow`  | Agent-level conditional branching    |
| `directReplyAgentflow`     | Direct response to user              |
| `customFunctionAgentflow`  | Custom JavaScript function           |
| `toolAgentflow`            | Tool integration                     |
| `retrieverAgentflow`       | Data retrieval                       |
| `stickyNoteAgentflow`      | Canvas annotation (not connectable)  |
| `httpAgentflow`            | HTTP request                         |
| `iterationAgentflow`       | Iteration / map-reduce container     |
| `executeFlowAgentflow`     | Execute a sub-flow                   |

### Design Note

`<Agentflow>` is an **uncontrolled component**. The `initialFlow` prop seeds the canvas state on mount, but the component owns its own state afterward. Use the `ref` for imperative access and `onFlowChange` to observe changes.

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run examples
cd examples && pnpm install && pnpm dev
```

Visit the [examples](./examples) directory for more usage patterns. See [TESTS.md](./TESTS.md) for the full test plan and coverage status.

## Troubleshooting

### API Connection Issues

-   **CORS errors** — Ensure the Flowise server allows requests from your app's origin. Check the Flowise CORS configuration.
-   **401 Unauthorized** — Use an API Key (Settings > API Keys), not a JWT user token. Verify the key is passed via the `token` prop.
-   **Wrong `apiBaseUrl`** — The URL must point to the Flowise API root (e.g., `http://localhost:3000`), not a subpath.

### Validation Errors

-   **"Flow is empty"** — Add at least one node to the canvas.
-   **"Missing start node"** — Every flow requires a `startAgentflow` node. Add one from the palette.
-   **"Disconnected nodes"** — All non-sticky-note nodes must be reachable from the start node. Connect any orphaned nodes.
-   **"Cycle detected"** — Flows must be acyclic (DAGs). Remove the edge that creates the cycle.

### Theme Issues

-   **Dark mode not applying** — Pass `isDarkMode={true}` as a prop. The component uses its own design tokens and does not inherit from the host app's theme.
-   **Style conflicts** — Ensure `@flowiseai/agentflow/flowise.css` is imported. The component's CSS variables are scoped to avoid collisions.

### Variables Not Resolving

-   **Variable not in picker** — Variables are sourced from upstream nodes. Ensure the source node is connected and upstream of the current node.
-   **Incorrect path** — Variable syntax is `{{nodeName.outputKey}}`. Check that the node name and output key match exactly.

### Async Options Not Loading

-   **Empty dropdowns for models/tools/credentials** — These load from the Flowise API. Verify `apiBaseUrl` and `token` are correct and the server is running.
-   **Network errors in console** — Check browser DevTools for failed requests. The API client logs errors to the console.

## Documentation

-   [ARCHITECTURE.md](./ARCHITECTURE.md) - Internal architecture and design patterns
-   [TESTS.md](./TESTS.md) - Test plan, coverage tiers, and configuration
-   [Examples](./examples/README.md) - Usage examples and demos

## Contributing

This package follows a feature-based architecture with clear separation of concerns. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details on the project structure and development guidelines.

## License

Apache-2.0 — see the repository root [LICENSE.md](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md) for details.

---

Part of the [Flowise](https://github.com/FlowiseAI/Flowise) ecosystem
