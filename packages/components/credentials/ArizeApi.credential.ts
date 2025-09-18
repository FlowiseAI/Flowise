import { INodeParams, INodeCredential } from '../src/Interface'

class ArizeApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Arize API'
        this.name = 'arizeApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.arize.com/arize">official guide</a> on how to get API keys on Arize.'
        this.inputs = [
            {
                label: 'API Key',
                name: 'arizeApiKey',
                type: 'password',
                placeholder: '<ARIZE_API_KEY>'
            },
            {
                label: 'Space ID',
                name: 'arizeSpaceId',
                type: 'string',
                placeholder: '<ARIZE_SPACE_ID>'
            },
            {
                label: 'Endpoint',
                name: 'arizeEndpoint',
                type: 'string',
                default: 'https://otlp.arize.com'
            }
        ]
    }
}

module.exports = { credClass: ArizeApi }
