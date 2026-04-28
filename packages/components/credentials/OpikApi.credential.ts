import { INodeParams, INodeCredential } from '../src/Interface'

class OpikApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Opik API'
        this.name = 'opikApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://www.comet.com/docs/opik/tracing/sdk_configuration">Opik documentation</a> on how to configure Opik credentials'
        this.inputs = [
            {
                label: 'API Key',
                name: 'opikApiKey',
                type: 'password',
                placeholder: '<OPIK_API_KEY>'
            },
            {
                label: 'URL',
                name: 'opikUrl',
                type: 'string',
                placeholder: 'https://www.comet.com/opik/api'
            },
            {
                label: 'Workspace',
                name: 'opikWorkspace',
                type: 'string',
                placeholder: 'default'
            }
        ]
    }
}

module.exports = { credClass: OpikApi }
