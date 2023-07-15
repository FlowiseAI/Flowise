import { INodeParams, INodeCredential } from '../src/Interface'

class CohereApi implements INodeCredential {
    label: string
    name: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cohere API'
        this.name = 'cohereApi'
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
