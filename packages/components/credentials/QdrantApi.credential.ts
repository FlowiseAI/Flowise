import { INodeParams, INodeCredential } from '../src/Interface'

class QdrantApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Qdrant API'
        this.name = 'qdrantApi'
        this.inputs = [
            {
                label: 'Qdrant API Key',
                name: 'qdrantApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: QdrantApi }
