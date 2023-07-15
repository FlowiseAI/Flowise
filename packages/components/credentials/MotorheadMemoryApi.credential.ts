import { INodeParams, INodeCredential } from '../src/Interface'

class MotorheadMemoryApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Motorhead Memory API'
        this.name = 'motorheadMemoryApi'
        this.description =
            'Refer to <a target="_blank" href="https://docs.getmetal.io/misc-get-keys">official guide</a> on how to create API key and Client ID on Motorhead Memory'
        this.inputs = [
            {
                label: 'Client ID',
                name: 'clientId',
                type: 'string'
            },
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MotorheadMemoryApi }
