import { INodeParams, INodeCredential } from '../src/Interface'

class LangWatchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'LangWatch API'
        this.name = 'langwatchApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.langwatch.ai/integration/python/guide">integration guide</a> on how to get API keys on LangWatch'
        this.inputs = [
            {
                label: 'API Key',
                name: 'langWatchApiKey',
                type: 'password',
                placeholder: '<LANGWATCH_API_KEY>'
            },
            {
                label: 'Endpoint',
                name: 'langWatchEndpoint',
                type: 'string',
                default: 'https://app.langwatch.ai'
            }
        ]
    }
}

module.exports = { credClass: LangWatchApi }
