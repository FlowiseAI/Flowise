import { INodeParams, INodeCredential } from '../src/Interface'

class SerpApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serp API'
        this.name = 'serpApi'
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
