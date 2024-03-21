import { INodeParams, INodeCredential } from '../src/Interface'

class VoyageAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Voyage AI API'
        this.name = 'voyageAIApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.voyageai.com/docs/api-key-and-installation">official guide</a> on how to create API key on VoyageAI'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: VoyageAIApi }
