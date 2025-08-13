import { INodeParams, INodeCredential } from '../src/Interface'

class ElevenLabsApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Eleven Labs API'
        this.name = 'elevenLabsApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Eleven Labs API Key',
                name: 'elevenLabsApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ElevenLabsApi }
