import { INodeParams, INodeCredential } from '../src/Interface'

class CloudflareApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cloudflare API'
        this.name = 'cloudflareApi'
        this.version = 1.0
        this.description = 'Use your Cloudflare Account ID and API Token'
        this.inputs = [
            {
                label: 'Cloudflare Account ID',
                name: 'cloudflareAccountId',
                type: 'string'
            },
            {
                label: 'Cloudflare API Token',
                name: 'cloudflareApiToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: CloudflareApi }
