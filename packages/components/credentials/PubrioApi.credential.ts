import { INodeParams, INodeCredential } from '../../../src/Interface'

class PubrioApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Pubrio API'
        this.name = 'pubrioApi'
        this.version = 1.0
        this.description =
            'Get your API key from <a target="_blank" href="https://dashboard.pubrio.com">dashboard.pubrio.com</a>'
        this.inputs = [
            {
                label: 'Pubrio API Key',
                name: 'pubrioApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: PubrioApi }
