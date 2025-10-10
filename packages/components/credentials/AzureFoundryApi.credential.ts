import { INodeParams, INodeCredential } from '../src/Interface'

class AzureFoundryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure Foundry API'
        this.name = 'azureFoundryApi'
        this.version = 1.0
        this.description = 'Refer to <a target="_blank" href="https://docs.microsoft.com/en-us/azure/ai-foundry/">Azure AI Foundry documentation</a> for setup instructions'
        this.inputs = [
            {
                label: 'Azure Foundry API Key',
                name: 'azureFoundryApiKey',
                type: 'password',
                description: 'Your Azure AI Foundry API key'
            },
            {
                label: 'Azure Foundry Endpoint',
                name: 'azureFoundryEndpoint',
                type: 'string',
                placeholder: 'https://your-foundry-instance.azure.com',
                description: 'Your Azure AI Foundry endpoint URL'
            }
        ]
    }
}

module.exports = { credClass: AzureFoundryApi }
