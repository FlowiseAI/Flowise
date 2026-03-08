import { INodeParams, INodeCredential } from '../src/Interface'

class OllamaApi implements INodeCredential {
    label: string
    name: string
    description: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Ollama API'
        this.name = 'ollamaApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Ollama Api Key',
                name: 'ollamaApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: OllamaApi }
