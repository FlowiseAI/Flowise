import { INodeCredential, INodeParams } from '../src/Interface'

class MiniMaxApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'MiniMax API'
        this.name = 'miniMaxApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'MiniMax API Key',
                name: 'miniMaxApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MiniMaxApi }
