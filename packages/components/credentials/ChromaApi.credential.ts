import { INodeParams, INodeCredential } from '../src/Interface'

class ChromaApi implements INodeCredential {
    label: string
    name: string
    description: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Chroma API'
        this.name = 'chromaApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Chroma Api Key',
                name: 'chromaApiKey',
                type: 'password'
            },
            {
                label: 'Chroma Tenant',
                name: 'chromaTenant',
                type: 'string'
            },
            {
                label: 'Chroma Database',
                name: 'chromaDatabase',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: ChromaApi }
