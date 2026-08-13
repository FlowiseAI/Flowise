import { INodeParams, INodeCredential } from '../src/Interface'

class FunASRApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'FunASR API'
        this.name = 'funASRApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'API Key',
                name: 'funASRApiKey',
                type: 'password',
                description: 'Optional bearer token for a FunASR server behind an authenticated gateway'
            }
        ]
    }
}

module.exports = { credClass: FunASRApi }
