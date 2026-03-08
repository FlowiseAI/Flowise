import { INodeParams, INodeCredential } from '../src/Interface'

class CerebrasAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cerebras API Key'
        this.name = 'cerebrasAIApi'
        this.version = 2.0
        this.description = 'Get your free API key from Cerebras Cloud'
        this.inputs = [
            {
                label: 'Cerebras API Key',
                name: 'cerebrasApiKey',
                type: 'password',
                description: 'Get your API key from https://cloud.cerebras.ai/ (starts with csk-)'
            }
        ]
    }
}

module.exports = { credClass: CerebrasAPIAuth }
