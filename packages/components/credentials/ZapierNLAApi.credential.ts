import { INodeParams, INodeCredential } from '../src/Interface'

class ZapierNLAApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Zapier NLA API'
        this.name = 'zapierNLAApi'
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
