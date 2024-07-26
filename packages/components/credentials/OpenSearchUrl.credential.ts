import { INodeParams, INodeCredential } from '../src/Interface'

class OpenSearchUrl implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenSearch'
        this.name = 'openSearchUrl'
        this.version = 1.0
        this.inputs = [
            {
                label: 'OpenSearch Url',
                name: 'openSearchUrl',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: OpenSearchUrl }
