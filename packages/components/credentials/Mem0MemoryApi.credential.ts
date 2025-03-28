import { INodeParams, INodeCredential } from '../src/Interface'

class Mem0MemoryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Mem0 Memory API'
        this.name = 'mem0MemoryApi'
        this.version = 1.0
        this.description =
            'Visit <a target="_blank" href="https://app.mem0.ai/settings/api-keys">Mem0 Platform</a> to get your API credentials'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'API Key from Mem0 dashboard'
            }
        ]
    }
}

module.exports = { credClass: Mem0MemoryApi }
