import { OpenAIBaseInput } from 'langchain/dist/types/openai-types'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { AzureOpenAIInput, ChatOpenAI } from 'langchain/chat_models/openai'

class AzureChatOpenAI_ChatModels implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure ChatOpenAI'
        this.name = 'azureChatOpenAI'
        this.type = 'AzureChatOpenAI'
        this.icon = 'Azure.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Azure OpenAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.inputs = [
            {
                label: 'Azure OpenAI Api Key',
                name: 'azureOpenAIApiKey',
                type: 'password'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 0.9,
                optional: true
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
                placeholder: 'YOUR-API-VERSION'
            },
            {
                label: 'Azure OpenAIApi Embeddings Deployment Name',
                name: 'azureOpenAIApiEmbeddingsDeploymentName',
                type: 'string',
                placeholder: 'YOUR-EMBEDDINGS-NAME',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Azure OpenAI Api Completions Deployment Name',
                name: 'azureOpenAIApiCompletionsDeploymentName',
                type: 'string',
                placeholder: 'YOUR-COMPLETIONS-NAME',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const azureOpenAIApiKey = nodeData.inputs?.azureOpenAIApiKey as string
        const temperature = nodeData.inputs?.temperature as string
        const azureOpenAIApiInstanceName = nodeData.inputs?.azureOpenAIApiInstanceName as string
        const azureOpenAIApiDeploymentName = nodeData.inputs?.azureOpenAIApiDeploymentName as string
        const azureOpenAIApiVersion = nodeData.inputs?.azureOpenAIApiVersion as string
        const azureOpenAIApiEmbeddingsDeploymentName = nodeData.inputs?.azureOpenAIApiEmbeddingsDeploymentName as string
        const azureOpenAIApiCompletionsDeploymentName = nodeData.inputs?.azureOpenAIApiCompletionsDeploymentName as string

        const obj: Partial<AzureOpenAIInput> & Partial<OpenAIBaseInput> = {
            temperature: parseInt(temperature, 10),
            azureOpenAIApiKey,
            azureOpenAIApiInstanceName,
            azureOpenAIApiDeploymentName,
            azureOpenAIApiVersion
        }

        if (azureOpenAIApiEmbeddingsDeploymentName) obj.azureOpenAIApiEmbeddingsDeploymentName = azureOpenAIApiEmbeddingsDeploymentName
        if (azureOpenAIApiCompletionsDeploymentName) obj.azureOpenAIApiCompletionsDeploymentName = azureOpenAIApiCompletionsDeploymentName

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: AzureChatOpenAI_ChatModels }
