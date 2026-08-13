import { INodeCredential, INodeParams } from '../src/Interface'

class GreenPTApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'GreenPT API'
        this.name = 'greenPTApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'GreenPT API Key',
                name: 'greenPTApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: GreenPTApi }
