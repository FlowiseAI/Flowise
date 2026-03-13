import { INodeParams, INodeCredential } from '../src/Interface'

class AvianAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Avian API Key'
        this.name = 'avianApi'
        this.version = 1.0
        this.description = 'Get your API key from Avian'
        this.inputs = [
            {
                label: 'Avian API Key',
                name: 'avianApiKey',
                type: 'password',
                description: 'Get your API key from https://avian.io'
            }
        ]
    }
}

module.exports = { credClass: AvianAPIAuth }
