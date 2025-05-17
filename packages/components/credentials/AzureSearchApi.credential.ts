import { INodeParams, INodeCredential } from '../src/Interface'

class AzureSearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure Cognitive Search API'
        this.name = 'azureSearchApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Azure Search Key',
                name: 'azureSearchKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AzureSearchApi }
