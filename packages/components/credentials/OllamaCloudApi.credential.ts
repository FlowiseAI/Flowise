import { INodeParams, INodeCredential } from '../src/Interface'

class OllamaCloudApi implements INodeCredential {
    label: string
    name: string
    version: number
    description?: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Ollama Cloud API'
        this.name = 'ollamaCloudApi'
        this.version = 1.0
        this.description = 'API key for Ollama Cloud (https://ollama.com)'
        this.inputs = [
            {
                label: 'Ollama Cloud API Key',
                name: 'ollamaCloudApiKey',
                type: 'password',
                placeholder: 'sk-...'
            }
        ]
    }
}

module.exports = { credClass: OllamaCloudApi }

