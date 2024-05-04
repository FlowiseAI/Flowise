import { INodeParams, INodeCredential } from '../src/Interface'

class VectaraAPI implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Vectara API'
        this.name = 'vectaraApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Vectara Customer ID',
                name: 'customerID',
                type: 'string'
            },
            {
                label: 'Vectara Corpus ID',
                name: 'corpusID',
                type: 'string'
            },
            {
                label: 'Vectara API Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: VectaraAPI }
