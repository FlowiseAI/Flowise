import { INodeParams, INodeCredential } from '../src/Interface'

class DataForB2BApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'DataForB2B API'
        this.name = 'dataForB2BApi'
        this.version = 1.0
        this.description =
            'Get your API key at <a target="_blank" href="https://app.dataforb2b.ai">app.dataforb2b.ai</a>. It is sent as the <code>api_key</code> request header.'
        this.inputs = [
            {
                label: 'DataForB2B API Key',
                name: 'dataForB2BApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: DataForB2BApi }
