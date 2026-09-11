import { INodeParams, INodeCredential } from '../src/Interface'

class RequestyAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Requesty API Key'
        this.name = 'requestyApi'
        this.version = 1.0
        this.description = 'Get your API key from the <a target="_blank" href="https://app.requesty.ai/api-keys">Requesty</a> dashboard.'
        this.inputs = [
            {
                label: 'Requesty API Key',
                name: 'requestyApiKey',
                type: 'password',
                description: 'API Key'
            }
        ]
    }
}

module.exports = { credClass: RequestyAPIAuth }
