import { INodeParams, INodeCredential } from '../src/Interface'

class AgentLineApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'AgentLine API'
        this.name = 'agentLineApi'
        this.version = 1.0
        this.description =
            'Sign up at <a target="_blank" href="https://agentline.cloud">AgentLine</a> to get your API key. ' +
            'AgentLine gives AI agents real phone numbers, voice, and SMS capabilities.'
        this.inputs = [
            {
                label: 'API Key',
                name: 'agentLineApiKey',
                type: 'password',
                description: 'Your AgentLine API key (starts with sk_live_)',
                placeholder: 'sk_live_xxxxxxxxxxxxxxxx'
            },
            {
                label: 'Base URL',
                name: 'agentLineBaseUrl',
                type: 'string',
                default: 'https://api.agentline.cloud',
                description: 'AgentLine API base URL. Change only if you are running a self-hosted instance.',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: AgentLineApi }
