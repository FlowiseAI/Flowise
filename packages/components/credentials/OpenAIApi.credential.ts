import { INodeParams, INodeCredential } from '../src/Interface'

class OpenAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI API'
        this.name = 'openAIApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'OpenAI Api Key',
                name: 'openAIApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: OpenAIApi }
