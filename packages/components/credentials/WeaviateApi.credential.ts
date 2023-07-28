import { INodeParams, INodeCredential } from '../src/Interface'

class WeaviateApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Weaviate API'
        this.name = 'weaviateApi'
        this.version = 1.0
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
