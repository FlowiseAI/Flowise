import { INodeParams, INodeCredential } from '../src/Interface'

class SerperApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serper API'
        this.name = 'serperApi'
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
