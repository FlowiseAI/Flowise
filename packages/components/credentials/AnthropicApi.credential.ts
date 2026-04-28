import { INodeParams, INodeCredential } from '../src/Interface'

class AnthropicApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Anthropic API'
        this.name = 'anthropicApi'
        this.version = 1.0
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
