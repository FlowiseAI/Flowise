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
            'Refer to <a target="_blank" href="https://azure.microsoft.com/en-us/products/cognitive-services/openai-service">official guide</a> of how to use Azure OpenAI service'
        this.inputs = [
            {
                label: 'Azure OpenAI Api Key',
                name: 'azureOpenAIApiKey',
                type: 'password',
                description: `Refer to <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/quickstart?tabs=command-line&pivots=rest-api#set-up">official guide</a> on how to create API key on Azure OpenAI`
            },
            {
                label: 'Azure OpenAI Api Instance Name',
                name: 'azureOpenAIApiInstanceName',
                type: 'string',
                placeholder: 'YOUR-INSTANCE-NAME'
            },
            {
                label: 'Azure OpenAI Api Deployment Name',
                name: 'azureOpenAIApiDeploymentName',
                type: 'string',
                placeholder: 'YOUR-DEPLOYMENT-NAME'
            },
            {
                label: 'Azure OpenAI Api Version',
                name: 'azureOpenAIApiVersion',
                type: 'string',
                placeholder: '2023-06-01-preview',
                description:
                    'Description of Supported API Versions. Please refer <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#chat-completions">examples</a>'
            }
        ]
    }
}

module.exports = { credClass: AzureOpenAIApi }
