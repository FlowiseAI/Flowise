import { INodeParams, INodeCredential } from '../src/Interface'

class LMStudioApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'LM Studio API'
        this.name = 'lmstudioApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'LM Studio Api Key',
                name: 'lmstudioApiKey',
                type: 'password',
                description: 'Optional. Most local LM Studio instances do not require an API key.'
            }
        ]
    }
}

module.exports = { credClass: LMStudioApi }
