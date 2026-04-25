import { INodeParams, INodeCredential } from '../src/Interface'

class FuturMixAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'FuturMix API Key'
        this.name = 'futurmixApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'FuturMix API Key',
                name: 'futurmixApiKey',
                type: 'password',
                description: 'API Key from https://futurmix.ai'
            }
        ]
    }
}

module.exports = { credClass: FuturMixAPIAuth }
