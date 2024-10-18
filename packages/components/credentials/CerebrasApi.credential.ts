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
        this.version = 1.0
        this.inputs = [
            {
                label: 'Cerebras API Key',
                name: 'cerebrasApiKey',
                type: 'password',
                description: 'API Key (cloud.cerebras.ai)'
            }
        ]
    }
}

module.exports = { credClass: CerebrasAPIAuth }
