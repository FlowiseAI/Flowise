import { INodeParams, INodeCredential } from '../src/Interface'

class N1nApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'n1n API'
        this.name = 'n1nApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'n1n Api Key',
                name: 'n1nApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: N1nApi }
