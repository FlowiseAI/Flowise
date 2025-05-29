import { INodeParams, INodeCredential } from '../../src/Interface'

class ComposioAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Composio API'
        this.name = 'composioApi'
        this.version = 1.0
        this.description = 'Authentication for the Composio API'
        this.inputs = [
            {
                label: 'Composio API Key',
                name: 'composioApiKey',
                type: 'password',
                description: 'Your Composio API Key',
                default: '',
                optional: false
            },
            {
                label: 'Workspace ID',
                name: 'workspaceId',
                type: 'string',
                description: 'Your Composio Workspace ID (optional)',
                default: '',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: ComposioAuth }