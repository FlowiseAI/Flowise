import { INodeParams, INodeCredential } from '../src/Interface'

class TokenMixApiAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'TokenMix API Key'
        this.name = 'tokenMixApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'TokenMix API Key',
                name: 'tokenMixApiKey',
                type: 'password',
                description: 'API Key'
            }
        ]
    }
}

module.exports = { credClass: TokenMixApiAuth }
