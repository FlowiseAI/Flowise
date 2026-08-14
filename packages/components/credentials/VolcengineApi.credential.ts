import { INodeCredential, INodeParams } from '../src/Interface'

class VolcengineApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Volcengine API'
        this.name = 'volcengineApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Volcengine API Key',
                name: 'volcengineApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: VolcengineApi }
