import { INodeParams, INodeCredential } from '../src/Interface'

class GroqApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Groq API'
        this.name = 'groqApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Groq Api Key',
                name: 'groqApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: GroqApi }
