import { INodeParams, INodeCredential } from '../src/Interface'

class MinimaxApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'MiniMax API'
        this.name = 'minimaxApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'MiniMax API Key',
                name: 'minimaxApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MinimaxApi }
