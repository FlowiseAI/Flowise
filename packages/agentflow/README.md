# @flowise/agentflow

[![Version](https://img.shields.io/npm/v/@flowise/agentflow)](https://www.npmjs.com/package/@flowise/agentflow)
[![License](https://img.shields.io/badge/license-SEE%20LICENSE-blue)](./LICENSE.md)

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
            <Agentflow instanceUrl='http://localhost:3000' token='your-api-key' />
        </div>
    )
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run examples
cd examples && pnpm install && pnpm dev
```

Visit the [examples](./examples) directory for more usage patterns.

## Documentation

-   [ARCHITECTURE.md](./ARCHITECTURE.md) - Internal architecture and design patterns
-   [Examples](./examples/README.md) - Usage examples and demos

## Contributing

This package follows a feature-based architecture with clear separation of concerns. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details on the project structure and development guidelines.

## License

See [LICENSE.md](./LICENSE.md) for details.

---

Part of the [Flowise](https://github.com/FlowiseAI/Flowise) ecosystem
