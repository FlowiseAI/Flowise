import { INodeParams, INodeCredential } from '../src/Interface'

class OpenAIApi implements INodeCredential {
    label: string
    name: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI API'
        this.name = 'openAIApi'
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
