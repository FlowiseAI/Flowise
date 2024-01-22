import { INodeParams, INodeCredential } from '../src/Interface'

class PineconeApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Pinecone API'
        this.name = 'pineconeApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Pinecone Api Key',
                name: 'pineconeApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: PineconeApi }
