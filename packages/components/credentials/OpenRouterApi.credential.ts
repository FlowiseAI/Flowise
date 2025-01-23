import { INodeParams, INodeCredential } from '../src/Interface'

class OpenRouterAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenRouter API Key'
        this.name = 'openRouterApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'OpenRouter API Key',
                name: 'openRouterApiKey',
                type: 'password',
                description: 'API Key'
            }
        ]
    }
}

module.exports = { credClass: OpenRouterAPIAuth }
