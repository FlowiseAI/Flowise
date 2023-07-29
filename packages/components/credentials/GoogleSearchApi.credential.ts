import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleSearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Custom Search API'
        this.name = 'googleCustomSearchApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Google Custom Search Api Key',
                name: 'googleCustomSearchApiKey',
                type: 'password'
            },
            {
                label: 'Programmable Search Engine ID',
                name: 'googleCustomSearchApiId',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: GoogleSearchApi }
