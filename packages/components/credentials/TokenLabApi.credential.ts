import { INodeCredential, INodeParams } from '../src/Interface'

class TokenLabApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'TokenLab API'
        this.name = 'tokenLabApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'TokenLab API Key',
                name: 'tokenLabApiKey',
                type: 'password',
                description: 'Create an API key from https://tokenlab.sh/dashboard'
            }
        ]
    }
}

module.exports = { credClass: TokenLabApi }
