import { INodeParams, INodeCredential } from '../src/Interface'

class BraveSearchApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Brave Search API'
        this.name = 'braveSearchApi'
        this.inputs = [
            {
                label: 'BraveSearch Api Key',
                name: 'braveApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: BraveSearchApi }
