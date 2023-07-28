import { INodeParams, INodeCredential } from '../src/Interface'

class SerperApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serper API'
        this.name = 'serperApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Serper Api Key',
                name: 'serperApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SerperApi }
