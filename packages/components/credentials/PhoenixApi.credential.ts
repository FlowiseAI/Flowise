import { INodeParams, INodeCredential } from '../src/Interface'

class PhoenixApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Phoenix API'
        this.name = 'phoenixApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.arize.com/phoenix">official guide</a> on how to get API keys on Phoenix.'
        this.inputs = [
            {
                label: 'API Key',
                name: 'phoenixApiKey',
                type: 'password',
                placeholder: '<PHOENIX_API_KEY>'
            },
            {
                label: 'Endpoint',
                name: 'phoenixEndpoint',
                type: 'string',
                default: 'https://app.phoenix.arize.com'
            }
        ]
    }
}

module.exports = { credClass: PhoenixApi }
