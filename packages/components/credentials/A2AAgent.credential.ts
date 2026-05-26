import { INodeParams, INodeCredential } from '../src/Interface'

class A2AAgentCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'A2A Agent'
        this.name = 'a2aAgentCredential'
        this.version = 1.0
        this.description = 'Authenticate with a remote A2A protocol agent'
        this.inputs = [
            {
                label: 'Auth Type',
                name: 'authType',
                type: 'options',
                options: [
                    {
                        label: 'API Key',
                        name: 'apiKey'
                    },
                    {
                        label: 'Bearer Token',
                        name: 'bearer'
                    }
                ]
            },
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'API key for the remote A2A agent (used when Auth Type is API Key)',
                optional: true
            },
            {
                label: 'API Key Header Name',
                name: 'apiKeyHeaderName',
                type: 'string',
                default: 'X-API-Key',
                description: 'HTTP header name to send the API key in',
                optional: true
            },
            {
                label: 'Bearer Token',
                name: 'bearerToken',
                type: 'password',
                description: 'Bearer token for the remote A2A agent (used when Auth Type is Bearer Token)',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: A2AAgentCredential }
