# PRD: @flowise/agentflow - Embeddable Flow Editor

## Executive Summary

Extract the Flowise Agentflow canvas into a standalone npm package that can be embedded in any React application.

```bash
npm install @flowise/agentflow
```

```typescript
import { Agentflow } from '@flowise/agentflow'
import '@flowise/flowise.css'

export default function App() {
    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Agentflow
                instanceUrl={'http://localhost:3000'} // where Flowise is hosted
                token={getTokenFromBackend()}
                flow={initialFlow}
            />
        </div>
    )
}
```

---

## Authentication Setup

### Step 1: Obtain Signing Key

Create a new API in Flowise to generate a signing key. This will generate a public and private key pair. The public key will be used by Flowise to verify the signature of the JWT tokens you send. The private key will be used by you to sign the JWT tokens.

### Step 2: Create a Demo Server and Generate a JWT

Create a new demo project under /packages/examples. The project should contains a NodeJS backend and React frontend.

The signing key will be used to generate JWT tokens for the currently logged-in user on your website, which will then be sent to the Flowise Iframe as a query parameter to authenticate the user and exchange the token for a longer lived token. To generate these tokens, you will need to add code in your backend to generate the token using the RS256 algorithm, so the JWT header would look like this:

```json
{
    "alg": "RS256",
    "typ": "JWT",
    "kid": "SIGNING_KEY_ID"
}
```

The signed tokens must include these claims in the payload. This is where we can get additional permissions from Third party provider and map to Flowise permissions. In the demo project, mock the permissions from Third party provider.

```json
{
    "permissions": "apiKey.permissions",
    "features": "features",
    "activeOrganizationId": "activeOrganizationId",
    "activeOrganizationSubscriptionId": "subscriptionId",
    "activeOrganizationCustomerId": "customerId",
    "activeOrganizationProductId": "productId",
    "isOrganizationAdmin": false,
    "activeWorkspaceId": "workspace.id",
    "activeWorkspace": "workspace.name",
    "exp": "exp"
}
```

You can use any JWT library to generate the token. Here is an example using the jsonwebtoken library in Node.js:

```javascript
const jwt = require('jsonwebtoken')

let token = jwt.sign(
    {
        permissions: apiKey.permissions,
        features,
        activeOrganizationId: activeOrganizationId,
        activeOrganizationSubscriptionId: subscriptionId,
        activeOrganizationCustomerId: customerId,
        activeOrganizationProductId: productId,
        isOrganizationAdmin: false,
        activeWorkspaceId: workspace.id,
        activeWorkspace: workspace.name,
        exp
    },
    process.env.FLOWISE_SIGNING_KEY,
    {
        algorithm: 'RS256',
        header: {
            kid: signingKeyID // Include the "kid" in the header
        }
    }
)
```

Create an API to sign and send the token in the demo project server side.

### Step 3: MFE Client Side Integration

In the demo project client side, pass in the JWT and apiHost:

```typescript
import { Agentflow } from '@flowise/agentflow'
import '@flowise/flowise.css'

export default function App() {
    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Agentflow
                instanceUrl={'http://localhost:3000'} // where Flowise is hosted
                token={getTokenFromBackend()} // call server side to get the token and pass it here
                flow={initialFlow}
                components={['agentAgentflow', 'llmAgentflow']} // components names
            />
        </div>
    )
}
```

---

## Package API

### Installation

```bash
npm install @flowise/agentflow
# or
pnpm add @flowise/agentflow
# or
yarn add @flowise/agentflow
```

### Exports

```typescript
// Main component
export { Agentflow } from './Agentflow'

// Hook for programmatic access
export { useAgentFlow } from './useAgentFlow'

// Types
export type { AgentflowProps, FlowData, FlowConfig, AgentFlowInstance } from './types'
```

### CSS Import

```typescript
import '@flowise/flowise.css'
```

---

## Component: `<Agentflow />`

### Props

| Prop         | Type               | Required | Description                                                                        |
| ------------ | ------------------ | -------- | ---------------------------------------------------------------------------------- |
| `apiHost`    | `string`           | ✅       | Base URL for Flowise API (e.g., `http://localhost:3000`)                           |
| `token`      | `string`           | ✅       | JWT token for authentication                                                       |
| `flow`       | `Chatflow \| null` | ❌       | Initial flow JSON data to render                                                   |
| `components` | `string[]`         | ❌       | Array of node names to make available (e.g., `['agentAgentflow', 'llmAgentflow']`) |

### Chatflow Type

```typescript
interface Chatflow {
    id: string
    name: string
    flowData: FlowData
    ...
}

interface FlowData {
  nodes: Node[]           // ReactFlow nodes
  edges: Edge[]           // ReactFlow edges
  viewport?: Viewport     // Canvas viewport (zoom, pan position)
}

interface Node {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
  // ... other ReactFlow node properties
}

interface Edge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  // ... other ReactFlow edge properties
}

interface Viewport {
  x: number
  y: number
  zoom: number
}
```

### Usage Example

```typescript
import { Agentflow } from '@flowise/agentflow'
import '@flowise/flowise.css'

// This can be fetched from Apphub then transformed into Flowise's ChatFlow entity format
const initialFlow = {
    id: '<app-id>',
    name: '<app-name>',
    flowData: {
        nodes: [
            {
                id: 'node-1',
                type: 'chatOpenAI',
                position: { x: 100, y: 100 },
                data: { label: 'OpenAI Chat', model: 'gpt-4' }
            }
        ],
        edges: []
    },
    chatbotConfig: {
        fullFileUpload: true
    }
}

export default function App() {
    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Agentflow
                instanceUrl={'http://localhost:3000'} // where Flowise is hosted
                token={getTokenFromBackend()} // call server side to get the token and pass it here
                flow={initialFlow}
                components={['agentAgentflow', 'llmAgentflow']} // components names
            />
        </div>
    )
}
```

---

## Hook: `useAgentFlow()`

### Returns: `AgentFlowInstance`

```typescript
interface AgentFlowInstance {
    // State getters
    getFlow(): FlowData // Get current flow as JSON

    // Utility
    toJSON(): string // Export flow as JSON string
    validate(): ValidationResult // Validate flow connections
}

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

---

## Example: Full Example of How Demo Project Frontend Looks Like

```typescript
// App.tsx - Complete example
import { useState, useCallback } from 'react'
import { AgentflowProvider, Agentflow, useAgentFlow, FlowData } from '@flowise/agentflow'
import '@flowise/flowise.css'

const API_HOST = 'http://localhost:3000'

// Sample initial data
// This can be fetched from Apphub then transformed into Flowise's ChatFlow entity format
const initialFlow = {
    id: '<app-id>',
    name: '<app-name>',
    flowData: {
        nodes: [
            {
                id: 'openai-1',
                type: 'chatOpenAI',
                position: { x: 400, y: 200 },
                data: {
                    label: 'ChatOpenAI',
                    inputs: { model: 'gpt-4', temperature: 0.7 }
                }
            }
        ],
        edges: []
    },
    chatbotConfig: {
        fullFileUpload: true
    }
}

export default function App() {
    const [savedFlow, setSavedFlow] = useState<FlowData | null>(null) // can be API to save to drafthub

    return (
        <AgentflowProvider>
            <div style={{ display: 'flex', height: '100vh' }}>
                {/* Sidebar */}
                <aside style={{ width: 280, borderRight: '1px solid #e0e0e0', padding: 16 }}>
                    <h2>My AI Flow Editor</h2>
                    <ControlPanel onSave={setSavedFlow} />
                    {savedFlow && (
                        <pre style={{ fontSize: 10, overflow: 'auto', maxHeight: 300 }}>{JSON.stringify(savedFlow, null, 2)}</pre>
                    )}
                </aside>

                {/* Canvas */}
                <main style={{ flex: 1 }}>
                    <Agentflow
                        instanceUrl={'http://localhost:3000'} // where Flowise is hosted
                        token={getTokenFromBackend()} // call server side to get the token and pass it here
                        flow={initialFlow}
                        components={['agentAgentflow', 'llmAgentflow']} // components names
                    />
                </main>
            </div>
        </AgentflowProvider>
    )
}

function ControlPanel({ onSave }: { onSave: (flow: FlowData) => void }) {
    const agentFlow = useAgentFlow()

    const handleSave = useCallback(() => {
        const flow = agentFlow.getFlow()
        onSave(flow)
        console.log('Saved!', flow)
    }, [agentFlow, onSave])

    const handleValidate = useCallback(() => {
        const result = agentFlow.validate()
        if (result.valid) {
            alert('✅ Flow is valid!')
        } else {
            alert('❌ Errors:\n' + result.errors.map((e) => e.message).join('\n'))
        }
    }, [agentFlow])

    const handleExport = useCallback(() => {
        const json = agentFlow.toJSON()
        navigator.clipboard.writeText(json)
        alert('Copied to clipboard!')
    }, [agentFlow])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleSave}>💾 Save Flow</button>
            <button onClick={handleValidate}>✅ Validate</button>
            <button onClick={handleExport}>📋 Copy JSON</button>
            <button onClick={() => agentFlow.fitView()}>🔍 Fit View</button>
        </div>
    )
}
```

---

## Runtime Flow

### How Chat Messages are Processed

1. **User sends a chat message** from Workday Chat to the new MFE server API: `/api/chat`. We can pass in tenant header or token, and the specific agentID.

2. **MFE server wraps** the Flowise MLPC + AppHub.

3. **MFE server decodes the token** and gets necessary permissions from Octopaas, then repeats Step 2 from Authentication Setup above.

4. **MFE server calls AppHub** via agentID to retrieve the zipped folder, unzip, then transforms it into Flowise's ChatFlow entity format.

5. **MFE server calls the Flowise Prediction API:**

```http
POST /prediction HTTP/1.1
Host: localhost:3000
X-Session-Token: JWT_TOKEN
Content-Type: application/json
Accept: */*

{
  "flow": {
    "id": "<app-id>",
    "name": "<app-name>",
    "flowData": {
      "nodes": [
        {
          "id": "openai-1",
          "type": "chatOpenAI",
          "position": { "x": 400, "y": 200 },
          "data": {
            "label": "ChatOpenAI",
            "inputs": { "model": "gpt-4", "temperature": 0.7 }
          }
        }
      ],
      "edges": []
    },
    "chatbotConfig": {
      "fullFileUpload": true
    }
  },
  "question": "What is artificial intelligence?",
}
```

The key pieces are:

1. To allow Prediction API and the Embeddable Flow Editor to pass in raw flow object. So refractor needs to be done to prevent relying on retrieving from database. Because we want to store the flows in somewhere else, not the database anymore. The source of truth for flows is not database anymore, mock it.
2. When the JWT token is being passed, Flowise server needs to be able to decrypt that into req.user object
