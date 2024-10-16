import { INodeParams, INodeCredential } from '../src/Interface'

class JinaAICredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'JinaAI API'
        this.name = 'jinaAIApi'
        this.version = 1.0
        this.description = 'You can get your API key from official <a target="_blank" href="https://jina.ai/">console</a> here.'
        this.inputs = [
            {
                label: 'JinaAI API Key',
                name: 'jinaAIAPIKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: JinaAICredential }
