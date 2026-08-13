import { INodeParams, INodeCredential } from '../src/Interface'

class MuApiApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'MuAPI API'
        this.name = 'muApiApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'MuAPI API Key',
                name: 'muApiKey',
                type: 'password',
                description: 'Get your API key at https://muapi.ai/dashboard/api-keys'
            }
        ]
    }
}

module.exports = { credClass: MuApiApi }
