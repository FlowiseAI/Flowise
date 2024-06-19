import { INodeParams, INodeCredential } from '../src/Interface'

class FireworksApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Fireworks API'
        this.name = 'fireworksApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Fireworks Api Key',
                name: 'fireworksApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: FireworksApi }
