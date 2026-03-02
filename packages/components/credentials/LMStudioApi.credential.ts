import { INodeCredential, INodeParams } from '../src/Interface'

class LMStudioApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'LM Studio API'
        this.name = 'lmStudioApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'LM Studio API Key',
                name: 'lmStudioApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: LMStudioApi }
