import { INodeParams, INodeCredential } from '../src/Interface'

class ExaSearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Exa Search API'
        this.name = 'exaSearchApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.exa.ai/reference/getting-started#getting-access">official guide</a> on how to get an API Key from Exa'
        this.inputs = [
            {
                label: 'ExaSearch Api Key',
                name: 'exaSearchApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ExaSearchApi }
