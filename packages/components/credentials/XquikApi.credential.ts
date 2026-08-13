import { INodeParams, INodeCredential } from '../src/Interface'

class XquikApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Xquik API'
        this.name = 'xquikApi'
        this.version = 1.0
        this.description = 'Use an Xquik API key for read-only public X/Twitter data tools'
        this.inputs = [
            {
                label: 'Xquik API Key',
                name: 'xquikApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: XquikApi }
