import { INodeParams, INodeCredential } from '../src/Interface'

class CRWApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'CRW API'
        this.name = 'crwApi'
        this.version = 1.0
        this.description =
            'Connect to CRW (self-hosted) or <a target="_blank" href="https://fastcrw.com">fastcrw.com</a> cloud. ' +
            'API key is optional for self-hosted instances without auth configured.'
        this.inputs = [
            {
                label: 'CRW API Key',
                name: 'crwApiKey',
                type: 'password',
                optional: true,
                description: 'Bearer token. Required for fastcrw.com, optional for self-hosted.'
            },
            {
                label: 'CRW API URL',
                name: 'crwApiUrl',
                type: 'string',
                default: 'http://localhost:3000',
                description: 'Base URL of your CRW instance. Use https://fastcrw.com for cloud.'
            }
        ]
    }
}

module.exports = { credClass: CRWApiCredential }
