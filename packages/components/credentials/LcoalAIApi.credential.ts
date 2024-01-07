import { INodeParams, INodeCredential } from '../src/Interface'

class LocalAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'LocalAI API'
        this.name = 'LocalAIApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'LocalAI Api Key',
                name: 'LocalAIApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: LocalAIApi }
