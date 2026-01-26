# @flowise/agentflow

Embeddable Flow Editor for Flowise - A React component that allows you to embed the Flowise Agentflow canvas in any React application.

## Installation

```bash
npm install @flowise/agentflow
# or
pnpm add @flowise/agentflow
# or
yarn add @flowise/agentflow
```

## Quick Start

```typescript
import { Agentflow, AgentflowProvider } from '@flowise/agentflow'
import '@flowise/agentflow/flowise.css'

export default function App() {
    return (
        <AgentflowProvider>
            <div style={{ position: 'fixed', inset: 0 }}>
                <Agentflow
                    instanceUrl='http://localhost:3000' // where Flowise is hosted
                    token={getTokenFromBackend()}
                    flow={initialFlow}
                    components={['agentAgentflow', 'llmAgentflow']}
                />
            </div>
        </AgentflowProvider>
    )
}
```

## Authentication Setup

### Step 1: Get Token From Your Server Side Cookies

```typescript
private async getSessionToken(req: Request, res: Response) {
    try {
        // Retrieve Octopaas token from cookies (developer account)
        const octopaasToken = req.cookies['octopaas_token']

        if (!octopaasToken) {
            return res.status(401).json({ message: 'No Octopaas token found' })
        }

        // Return token for frontend use
        res.json({ token: octopaasToken })
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve session token' })
    }
}
```

### Step 2: Pass Token to Component

```typescript
const token = await fetch('/api/generate-token').then(r => r.json())

<Agentflow
  instanceUrl="http://localhost:3000"
  token={token}
  flow={initialFlow}
/>
```

## API Reference

### `<Agentflow />` Component

| Prop           | Type                       | Required | Description                                                                        |
| -------------- | -------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `instanceUrl`  | `string`                   | ✅       | Base URL for Flowise API (e.g., `http://localhost:3000`)                           |
| `token`        | `string`                   | ✅       | JWT token for authentication                                                       |
| `flow`         | `Chatflow \| null`         | ❌       | Initial flow JSON data to render                                                   |
| `components`   | `string[]`                 | ❌       | Array of node names to make available (e.g., `['agentAgentflow', 'llmAgentflow']`) |
| `onFlowChange` | `(flow: FlowData) => void` | ❌       | Callback when flow changes                                                         |
| `onSave`       | `(flow: FlowData) => void` | ❌       | Callback when flow is saved                                                        |

### `useAgentFlow()` Hook

Returns an `AgentFlowInstance` with the following methods:

```typescript
const agentFlow = useAgentFlow()

// Get current flow as JSON
const flow = agentFlow.getFlow()

// Export flow as JSON string
const jsonString = agentFlow.toJSON()

// Validate flow connections
const result = agentFlow.validate()

// Fit view to show all nodes
agentFlow.fitView()

// Get ReactFlow instance (advanced usage)
const reactFlowInstance = agentFlow.getReactFlowInstance()
```

### Validation Result

```typescript
interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
}

interface ValidationError {
    nodeId?: string
    edgeId?: string
    message: string
    type: 'missing_connection' | 'invalid_type' | 'circular_dependency'
}
```

## TypeScript Types

```typescript
import type { AgentflowProps, FlowData, Chatflow, AgentFlowInstance, ValidationResult } from '@flowise/agentflow'
```

## Full Example

See the complete example in [packages/examples/agentflow-demo](../examples/agentflow-demo/README.md).

## License

See LICENSE.md in the root of the Flowise repository.
