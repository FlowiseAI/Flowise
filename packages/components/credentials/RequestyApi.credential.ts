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
