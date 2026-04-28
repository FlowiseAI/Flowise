import { INodeParams, INodeCredential } from '../src/Interface'

class ComposioApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Composio API'
        this.name = 'composioApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Composio API Key',
                name: 'composioApi',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ComposioApi }
