import { INodeParams, INodeCredential } from '../src/Interface'

class TelnyxApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Telnyx API'
        this.name = 'telnyxApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TelnyxApi }
