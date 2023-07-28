import { INodeParams, INodeCredential } from '../src/Interface'

class CohereApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cohere API'
        this.name = 'cohereApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Cohere Api Key',
                name: 'cohereApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: CohereApi }
