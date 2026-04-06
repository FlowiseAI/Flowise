import { INodeCredential, INodeParams } from '../src/Interface'

class EUrouterApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'EUrouter API'
        this.name = 'eUrouterApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'EUrouter API Key',
                name: 'eUrouterApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: EUrouterApi }
