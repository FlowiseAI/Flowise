import { INodeParams, INodeCredential } from '../src/Interface'

class RecallIOMemoryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'RecallIO Memory API'
        this.name = 'recallIOMemoryApi'
        this.version = 1.0
        this.description =
            'Visit <a target="_blank" href="https://app.recallio.ai/">RecallIO Platform</a> to get your API credentials'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'API Key from RecallIO dashboard'
            }
        ]
    }
}

module.exports = { credClass: RecallIOMemoryApi }
