import { INodeParams, INodeCredential } from '../src/Interface'

class TeradataBearerTokenCredential implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Teradata Bearer Token'
        this.name = 'teradataBearerToken'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Token',
                name: 'token',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TeradataBearerTokenCredential }
