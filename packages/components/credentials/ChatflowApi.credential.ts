import { INodeParams, INodeCredential } from '../src/Interface'

class ChatflowApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Chatflow API'
        this.name = 'chatflowApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Chatflow Api Key',
                name: 'chatflowApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ChatflowApi }
