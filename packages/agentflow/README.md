# @flowise/agentflow

[![Version](https://img.shields.io/npm/v/@flowise/agentflow)](https://www.npmjs.com/package/@flowise/agentflow)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md)

> Embeddable React component for building and visualizing AI agent workflows

## ⚠️ Status

**This package is currently under active development.**

-   🚧 Components are not yet fully functional
-   ❌ End-to-end functionality is not complete
-   🔄 Features are still being implemented and tested
-   ⚡ APIs may change before stable release
-   📝 Documentation is being updated as development progresses

**Cannot be used in production. For development and testing purposes only.**

## Overview

`@flowise/agentflow` is a React-based flow editor for creating AI agent workflows. It provides a visual canvas built on ReactFlow for connecting AI agents, LLMs, tools, and logic nodes.

## Installation

```bash
pnpm add @flowise/agentflow
```

**Peer Dependencies:**

```bash
pnpm add react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled reactflow
```

## Basic Usage

```tsx
import { Agentflow } from '@flowise/agentflow'

import '@flowise/agentflow/flowise.css'

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

import { Agentflow, type AgentFlowInstance, type FlowData } from '@flowise/agentflow'

import '@flowise/agentflow/flowise.css'

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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBaseUrl` | `string` | **(required)** | Flowise API server endpoint |
| `token` | `string` | — | Authentication token for API calls |
| `initialFlow` | `FlowData` | — | Initial flow data to render (uncontrolled — only used on mount) |
| `components` | `string[]` | — | Restrict which node types appear in the palette |
| `onFlowChange` | `(flow: FlowData) => void` | — | Called when the flow changes (node/edge add, remove, move) |
| `onSave` | `(flow: FlowData) => void` | — | Called when the user triggers a save |
| `onFlowGenerated` | `(flow: FlowData) => void` | — | Called when a flow is generated via AI |
| `isDarkMode` | `boolean` | `false` | Use dark mode theme |
| `readOnly` | `boolean` | `false` | Disable editing (nodes not draggable/connectable) |
| `showDefaultHeader` | `boolean` | `true` | Show built-in header (ignored if `renderHeader` provided) |
| `showDefaultPalette` | `boolean` | `true` | Show built-in node palette |
| `enableGenerator` | `boolean` | `true` | Show the AI flow generator button |
| `renderHeader` | `(props: HeaderRenderProps) => ReactNode` | — | Custom header renderer |
| `renderNodePalette` | `(props: PaletteRenderProps) => ReactNode` | — | Custom node palette renderer |

### Imperative Methods (via `ref`)

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getFlow()` | `FlowData` | Get current flow data |
| `toJSON()` | `string` | Export flow as JSON string |
| `validate()` | `ValidationResult` | Validate the current flow |
| `fitView()` | `void` | Fit all nodes into view |
| `clear()` | `void` | Remove all nodes and edges |
| `addNode(nodeData)` | `void` | Add a node (`Partial<FlowNode>`) |

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

## Publishing

### Version Update

Bump the version in `package.json` before publishing. Use `npm version` to update the version and create a git tag:

```bash
# Prerelease (for testing)
npm version prerelease --preid=dev   # 0.0.0-dev.1 → 0.0.0-dev.2

# Patch / Minor / Major (for stable releases)
npm version patch                    # 0.0.1
npm version minor                    # 0.1.0
npm version major                    # 1.0.0
```

### Verify Before Publishing

```bash
# Build and check the tarball contents
pnpm build
npm pack --dry-run

# Full publish dry-run (runs prepublishOnly + simulates upload)
npm publish --dry-run
```

### Publish

```bash
# Prerelease — tagged so `npm install @flowise/agentflow` won't pick it up
npm publish --tag dev

# Stable release — gets the `latest` tag
npm publish
```

> The `prepublishOnly` script automatically runs `clean` and `build` before every publish, so stale dist files are never uploaded.

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
