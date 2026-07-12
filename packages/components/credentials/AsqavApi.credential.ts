import { INodeParams, INodeCredential } from '../src/Interface'

class AsqavApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Asqav API'
        this.name = 'asqavApi'
        this.version = 1.0
        this.description =
            'API key for Asqav. Issued in the Asqav dashboard. Used to sign agent actions and obtain cryptographic compliance receipts.'
        this.inputs = [
            {
                label: 'Asqav API Key',
                name: 'asqavApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AsqavApi }
