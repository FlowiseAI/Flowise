import { INodeParams, INodeCredential } from '../src/Interface'

class MistralAICredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'MistralAI API'
        this.name = 'mistralAIApi'
        this.version = 1.0
        this.description = 'You can get your API key from official <a target="_blank" href="https://console.mistral.ai/">console</a> here.'
        this.inputs = [
            {
                label: 'MistralAI API Key',
                name: 'mistralAIAPIKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MistralAICredential }
