import { INodeParams, INodeCredential } from '../src/Interface'

class OlostepApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Olostep API'
        this.name = 'olostepApi'
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

module.exports = { credClass: OlostepApi }
