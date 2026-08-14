import { INodeParams, INodeCredential } from '../src/Interface'

class YouDotComApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'You.com API'
        this.name = 'youDotComApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'YDC API Key',
                name: 'ydcApiKey',
                type: 'password',
                description: 'API key from you.com/platform/api-keys'
            }
        ]
    }
}

module.exports = { credClass: YouDotComApi }
