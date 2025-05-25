import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleADKAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google ADK Authentication'
        this.name = 'googleADKAuth'
        this.version = 1.0
        this.description = 'Authentication for Google ADK'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'Google ADK API Key'
            },
            {
                label: 'Project ID',
                name: 'projectId',
                type: 'string',
                description: 'Google Cloud Project ID',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: GoogleADKAuth }