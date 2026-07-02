import { INodeParams, INodeCredential } from '../src/Interface'

class LoopQuestApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'LoopQuest API'
        this.name = 'loopQuestApi'
        this.version = 1.0
        this.description = 'Your LoopQuest workspace API key (Workspaces → API keys).'
        this.inputs = [
            {
                label: 'API Key',
                name: 'loopQuestApiKey',
                type: 'password'
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                optional: true,
                default: 'https://loopquest.tomphillips.uk',
                description: 'Only change this for a self-hosted LoopQuest deployment.'
            }
        ]
    }
}

module.exports = { credClass: LoopQuestApi }
