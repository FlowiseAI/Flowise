import { INodeCredential, INodeParams } from '../src/Interface'

class DeepseekApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'DeepseekAI API'
        this.name = 'deepseekApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'DeepseekAI API Key',
                name: 'deepseekApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: DeepseekApi }
