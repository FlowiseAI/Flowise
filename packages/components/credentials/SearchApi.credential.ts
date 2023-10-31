import { INodeParams, INodeCredential } from '../src/Interface'

class SearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Search API'
        this.name = 'searchApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'SearchApi API Key',
                name: 'searchApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SearchApi }
