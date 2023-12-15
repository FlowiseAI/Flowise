import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleGenerativeAICredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Generative AI'
        this.name = 'googleGenerativeAI'
        this.version = 1.0
        this.description =
            'You can get your API key from official <a target="_blank" href="https://ai.google.dev/tutorials/setup">page</a> here.'
        this.inputs = [
            {
                label: 'Google AI API Key',
                name: 'googleGenerativeAPIKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: GoogleGenerativeAICredential }
