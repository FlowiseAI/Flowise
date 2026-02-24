import { INodeParams, INodeCredential } from '../src/Interface'

class CambAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'CAMB AI API'
        this.name = 'cambAIApi'
        this.version = 1.0
        this.description = 'Get your API key from <a target="_blank" href="https://studio.camb.ai">CAMB AI Studio</a>'
        this.inputs = [
            {
                label: 'CAMB AI API Key',
                name: 'cambApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: CambAIApi }
