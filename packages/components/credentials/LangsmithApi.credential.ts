import { INodeParams, INodeCredential } from '../src/Interface'

class LangsmithApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Langsmith API'
        this.name = 'langsmithApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.smith.langchain.com/">official guide</a> on how to get API key on Langsmith'
        this.inputs = [
            {
                label: 'API Key',
                name: 'langSmithApiKey',
                type: 'password',
                placeholder: '<LANGSMITH_API_KEY>'
            },
            {
                label: 'Endpoint',
                name: 'langSmithEndpoint',
                type: 'string',
                default: 'https://api.smith.langchain.com'
            }
        ]
    }
}

module.exports = { credClass: LangsmithApi }
