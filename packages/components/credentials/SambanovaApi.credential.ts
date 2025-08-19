import { INodeParams, INodeCredential } from '../src/Interface'

class SambanovaApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Sambanova API'
        this.name = 'sambanovaApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Sambanova Api Key',
                name: 'sambanovaApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SambanovaApi }
