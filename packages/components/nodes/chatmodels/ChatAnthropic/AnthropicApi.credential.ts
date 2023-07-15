import { INodeParams, INodeCredential } from '../../../src/Interface'

class AnthropicApi implements INodeCredential {
    label: string
    name: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Anthropic API'
        this.name = 'anthropicApi'
        this.inputs = [
            {
                label: 'Anthropic Api Key',
                name: 'anthropicApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AnthropicApi }
