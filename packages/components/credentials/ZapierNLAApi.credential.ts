import { INodeParams, INodeCredential } from '../src/Interface'

class ZapierNLAApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Zapier NLA API'
        this.name = 'zapierNLAApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Zapier NLA Api Key',
                name: 'zapierNLAApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ZapierNLAApi }
