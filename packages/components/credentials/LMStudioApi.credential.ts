import { INodeParams, INodeCredential } from '../src/Interface'

class LMStudioApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'LM Studio API'
        this.name = 'lmStudioApi'
        this.version = 1.0
        this.description = 'LM Studio typically runs locally and does not require an API key. Leave blank for local instances.'
        this.inputs = [
            {
                label: 'LM Studio Api Key',
                name: 'lmStudioApiKey',
                type: 'password',
                optional: true,
                description: 'Optional API key for LM Studio (usually not required for local instances)'
            }
        ]
    }
}

module.exports = { credClass: LMStudioApi }