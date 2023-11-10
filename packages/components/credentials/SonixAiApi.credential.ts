import { INodeParams, INodeCredential } from '../src/Interface'

class SonixAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'SonixAI API'
        this.name = 'sonixAIApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'SonixAI Api Key',
                name: 'sonixAIApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SonixAIApi }