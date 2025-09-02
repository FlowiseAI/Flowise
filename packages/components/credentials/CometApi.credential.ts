import { INodeCredential, INodeParams } from '../src/Interface'

class CometApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Comet API'
        this.name = 'cometApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Comet API Key',
                name: 'cometApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: CometApi }
