import { INodeParams, INodeCredential } from '../src/Interface'

class SerpApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serp API'
        this.name = 'serpApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Serp Api Key',
                name: 'serpApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SerpApi }
