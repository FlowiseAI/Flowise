import { INodeParams, INodeCredential } from '../src/Interface'

class XaiApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Xai API'
        this.name = 'xaiApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'X AI API Key',
                name: 'xaiApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: XaiApi }
