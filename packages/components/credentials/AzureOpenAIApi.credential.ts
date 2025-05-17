import { INodeParams, INodeCredential } from '../src/Interface'

class AzureOpenAIApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure OpenAI API'
        this.name = 'azureOpenAIApi'
        this.version = 1.0
        this.description =
            'Credentials required for sending requests to Azure OpenAI. Follow the <a target="_blank" href="https://azure.microsoft.com/en-us/products/cognitive-services/openai-service">official guide</a> to create a resource and gather these details.'
        this.inputs = [
            {
                label: 'Azure OpenAI Api Key',
                name: 'azureOpenAIApiKey',
                type: 'password',
                description: `Refer to the <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/quickstart?tabs=command-line&pivots=rest-api#set-up">official guide</a> for steps to generate your Azure OpenAI API key.`
            },
            {
                label: 'Azure OpenAI Api Instance Name',
                name: 'azureOpenAIApiInstanceName',
                type: 'string',
                placeholder: 'YOUR-INSTANCE-NAME',
                description: 'The name of your Azure OpenAI resource instance'
            },
            {
                label: 'Azure OpenAI Api Deployment Name',
                name: 'azureOpenAIApiDeploymentName',
                type: 'string',
                placeholder: 'YOUR-DEPLOYMENT-NAME',
                description: 'Deployment name configured in the Azure portal'
            },
            {
                label: 'Azure OpenAI Api Version',
                name: 'azureOpenAIApiVersion',
                type: 'string',
                placeholder: '2023-06-01-preview',
                description:
                    'Version of the Azure OpenAI API to use. See <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#chat-completions">documentation</a> for supported versions.'
            }
        ]
    }
}

module.exports = { credClass: AzureOpenAIApi }
