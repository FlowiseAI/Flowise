import { INodeParams, INodeCredential } from '../src/Interface'

class MomentoCacheApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Momento Cache API'
        this.name = 'momentoCacheApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.momentohq.com/cache/develop/authentication/api-keys">official guide</a> on how to get API key on Momento'
        this.inputs = [
            {
                label: 'Cache',
                name: 'momentoCache',
                type: 'string'
            },
            {
                label: 'API Key',
                name: 'momentoApiKey',
                type: 'password'
            },
            {
                label: 'Endpoint',
                name: 'momentoEndpoint',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: MomentoCacheApi }
