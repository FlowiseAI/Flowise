import { INodeParams, INodeCredential } from '../src/Interface'

class WeaviateApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Weaviate API'
        this.name = 'weaviateApi'
        this.inputs = [
            {
                label: 'Weaviate API Key',
                name: 'weaviateApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: WeaviateApi }
