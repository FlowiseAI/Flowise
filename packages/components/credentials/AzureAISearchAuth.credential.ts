import { INodeParams, INodeCredential } from '../src/Interface'

class AzureAISearchAuth implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'AzureAI Search Auth'
        this.name = 'azureAISearchAuth'
        this.version = 1.0
        this.inputs = [
            {
                label: 'AzureAI Search Endpoint',
                name: 'azureSearchEndpoint',
                type: 'string',
                description:
                    'Your Azure AI Search endpoint. The endpoint is the URL of your instance which you can find in the Azure Portal, under the "Overview" section of your instance'
            },
            {
                label: 'AzureAI Search API Key',
                name: 'azureSearchApiKey',
                type: 'password',
                description: 'The admin API key can be found under the  "Keys" section of your instance.'
            }
        ]
    }
}

module.exports = { credClass: AzureAISearchAuth }
