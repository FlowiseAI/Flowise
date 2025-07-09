# MCP Server Node Pattern

This document describes the standard pattern for implementing MCP server nodes in the Flowise Components package. Follow this guide to ensure consistency, discoverability, and UI integration for all MCP server nodes.

## Overview

MCP server nodes allow integration with external Model Context Protocol (MCP) servers, exposing their actions as tools within the Flowise platform. Each MCP node should be easily discoverable, extensible, and appear under the "Answer" tab in the UI.

## Node Structure

Each MCP server node should:

- Be implemented as a TypeScript class in its own directory under `packages/components/nodes/tools/MCP/{ServerName}/`.
- Implement the `INode` interface.
- Set the `tags` property to include `['AAI']`.
- Set the `category` property to `"MCP Servers"`.
- Provide a unique `label`, `name`, and `type`.
- Include a `description` and (optionally) a `documentation` URL.
- Define required credentials using the `credential` property (if needed).
- Expose available actions via an `inputs` parameter named `mcpActions` with `type: 'asyncMultiOptions'` and `loadMethod: 'listActions'`.
- Register the node by exporting it as `module.exports = { nodeClass: YourMCPClass }`.

## Example Template

```typescript
import { Tool } from '@langchain/core/tools'
import { INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam, getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class Example_MCP implements INode {
    label = 'Example MCP'
    name = 'exampleMCP'
    version = 1.0
    type = 'Example MCP Tool'
    icon = 'example.svg'
    category = 'MCP Servers'
    tags = ['AAI']
    description = 'MCP server that integrates the Example API'
    documentation = 'https://github.com/example/mcp-server'
    credential = {
        label: 'Connect Credential',
        name: 'credential',
        type: 'credential',
        credentialNames: ['exampleApi']
    }
    inputs = [
        {
            label: 'Available Actions',
            name: 'mcpActions',
            type: 'asyncMultiOptions',
            loadMethod: 'listActions',
            refresh: true
        }
    ]
    baseClasses = ['Tool']

    async getTools(nodeData: INodeData, options: any): Promise<Tool[]> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const packagePath = getNodeModulesPackagePath('example-mcp-server/dist/index.js')
        const serverParams = {
            command: process.execPath,
            args: [packagePath],
            env: {
                EXAMPLE_API_KEY: apiKey
            }
        }
        const toolkit = new MCPToolkit(serverParams, 'stdio')
        await toolkit.initialize()
        return toolkit.tools ?? []
    }
}

module.exports = { nodeClass: Example_MCP }
```

## Required Properties

- **tags**: Always include `['AAI']` to ensure the node appears in the "Answer" tab.
- **category**: Must be `"MCP Servers"`.
- **inputs**: Must include an `mcpActions` parameter as shown above.

## UI Tab Integration

Nodes with the `tags: ['AAI']` property and `category: 'MCP Servers'` will automatically appear in the "Answer" tab of the UI.

## Adding a New MCP Server Node

1. Copy the template above into a new file in `packages/components/nodes/tools/MCP/{ServerName}/{ServerName}MCP.ts`.
2. Update the class name, labels, credentials, and server integration as needed.
3. Add an appropriate SVG icon to the same directory.
4. Export the node class as `module.exports = { nodeClass: YourMCPClass }`.
5. Ensure the `tags` property includes `['AAI']`.
6. Test that the node appears in the "Answer" tab and is functional.

## Best Practices

- Keep all comments and documentation in English.
- Use clear, descriptive labels and documentation URLs.
- Validate credentials and provide helpful error messages.
- Keep the node implementation focused and maintainable.

---

For questions or improvements, update this README and notify the team. 