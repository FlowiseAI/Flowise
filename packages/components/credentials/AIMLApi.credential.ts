import { INodeParams, INodeCredential } from '../src/Interface'

class AIMLAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'AI / ML API Key'
        this.name = 'AIMLApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'AI / ML API Key',
                name: 'AIMLApiKey',
                type: 'password',
                description: 'API Key'
            }
        ]
    }
}

module.exports = { credClass: AIMLAPIAuth }
