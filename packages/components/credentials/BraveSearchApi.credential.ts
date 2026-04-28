import { INodeParams, INodeCredential } from '../src/Interface'

class BraveSearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Brave Search API'
        this.name = 'braveSearchApi'
        this.version = 1.0
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
