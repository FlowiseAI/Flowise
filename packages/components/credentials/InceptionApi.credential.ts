import { INodeParams, INodeCredential } from '../src/Interface'

class InceptionApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Inception API'
        this.name = 'inceptionApi'
        this.version = 1.0
        this.description = 'Get your API key from the Inception Platform dashboard'
        this.inputs = [
            {
                label: 'Inception API Key',
                name: 'inceptionApiKey',
                type: 'password',
                description: 'Get your API key from https://platform.inceptionlabs.ai/'
            }
        ]
    }
}

module.exports = { credClass: InceptionApi }
