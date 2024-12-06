import { INodeParams, INodeCredential } from '../src/Interface'

class N8nApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'N8n API'
        this.name = 'n8nApi'
        this.version = 1.0
        this.description = 'Credentials for N8n API'
        this.inputs = [
            {
                label: 'N8n API URL',
                name: 'apiUrl',
                type: 'string',
                placeholder: 'http://localhost:5678',
                description: 'Your N8n instance URL (e.g., http://localhost:5678 or https://n8n.your-domain.com)'
            },
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'Your N8n API key. Can be created in N8n under Settings > API'
            }
        ]
    }
}

module.exports = { credClass: N8nApi }
