import { INodeParams, INodeCredential } from '../src/Interface'

class MeilisearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Meilisearch API'
        this.name = 'MeilisearchApi'
        this.version = 1.0
        this.description = 'Refer to <a target="_blank" href="https://meilisearch.com">official guide</a> on how to get an API Key'
        this.inputs = [
            {
                label: 'Meilisearch API KEY',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MeilisearchApi }
