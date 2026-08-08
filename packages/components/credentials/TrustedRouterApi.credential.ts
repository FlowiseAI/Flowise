import { INodeParams, INodeCredential } from '../src/Interface'

class TrustedRouterAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'TrustedRouter API Key'
        this.name = 'trustedRouterApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'TrustedRouter API Key',
                name: 'trustedRouterApiKey',
                type: 'password',
                description: 'API Key from https://trustedrouter.com/console/api-keys'
            }
        ]
    }
}

module.exports = { credClass: TrustedRouterAPIAuth }
