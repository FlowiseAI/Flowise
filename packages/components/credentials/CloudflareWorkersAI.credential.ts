import { INodeCredential, INodeParams } from '../src/Interface'

class CloudflareWorkersAICredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cloudflare Workers AI'
        this.name = 'cloudflareWorkersAI'
        this.version = 1.0
        this.description = 'Input your Cloudflare credentials here.'
        this.inputs = [
            {
                label: 'Cloudflare Account ID',
                name: 'cloudflareWorkersAccountID',
                type: 'string'
            },
            {
                label: 'Cloudflare AI API Key',
                name: 'cloudflareWorkersAIKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: CloudflareWorkersAICredential }
