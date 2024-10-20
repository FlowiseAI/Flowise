import { INodeParams, INodeCredential } from '../src/Interface'

class TogetherAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'TogetherAI API'
        this.name = 'togetherAIApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'TogetherAI Api Key',
                name: 'togetherAIApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TogetherAIApi }
