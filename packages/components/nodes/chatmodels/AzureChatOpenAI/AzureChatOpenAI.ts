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
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'gpt-4',
                        name: 'gpt-4'
                    },
                    {
                        label: 'gpt-4-32k',
                        name: 'gpt-4-32k'
                    },
                    {
                        label: 'gpt-35-turbo',
                        name: 'gpt-35-turbo'
                    }
                ],
                default: 'gpt-35-turbo',
                optional: true
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
                type: 'options',
                options: [
                    {
                        label: '2023-03-15-preview',
                        name: '2023-03-15-preview'
                    }
                ],
                default: '2023-03-15-preview'
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const azureOpenAIApiKey = nodeData.inputs?.azureOpenAIApiKey as string
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const azureOpenAIApiInstanceName = nodeData.inputs?.azureOpenAIApiInstanceName as string
        const azureOpenAIApiDeploymentName = nodeData.inputs?.azureOpenAIApiDeploymentName as string
        const azureOpenAIApiVersion = nodeData.inputs?.azureOpenAIApiVersion as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string

        const obj: Partial<AzureOpenAIInput> & Partial<OpenAIBaseInput> = {
            temperature: parseInt(temperature, 10),
            modelName,
            azureOpenAIApiKey,
            azureOpenAIApiInstanceName,
            azureOpenAIApiDeploymentName,
            azureOpenAIApiVersion
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (frequencyPenalty) obj.frequencyPenalty = parseInt(frequencyPenalty, 10)
        if (presencePenalty) obj.presencePenalty = parseInt(presencePenalty, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: AzureChatOpenAI_ChatModels }
