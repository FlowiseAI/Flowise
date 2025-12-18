import { INodeParams, INodeCredential } from '../src/Interface'

class AIBadgrApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'AI Badgr API'
        this.name = 'aiBadgrApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'AI Badgr Api Key',
                name: 'aiBadgrApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AIBadgrApi }
