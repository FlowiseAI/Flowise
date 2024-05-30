import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { OpenAI } from 'llamaindex'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

interface AzureOpenAIConfig {
    apiKey?: string
    endpoint?: string
    apiVersion?: string
    deploymentName?: string
}

const ALL_AZURE_OPENAI_CHAT_MODELS = {
    'gpt-35-turbo': { contextWindow: 4096, openAIModel: 'gpt-3.5-turbo' },
    'gpt-35-turbo-16k': {
        contextWindow: 16384,
        openAIModel: 'gpt-3.5-turbo-16k'
    },
    'gpt-4': { contextWindow: 8192, openAIModel: 'gpt-4' },
    'gpt-4-32k': { contextWindow: 32768, openAIModel: 'gpt-4-32k' },
    'gpt-4-turbo': {
        contextWindow: 128000,
        openAIModel: 'gpt-4-turbo'
    },
    'gpt-4-vision-preview': {
        contextWindow: 128000,
        openAIModel: 'gpt-4-vision-preview'
    },
    'gpt-4-1106-preview': {
        contextWindow: 128000,
        openAIModel: 'gpt-4-1106-preview'
    }
}

class AzureChatOpenAI_LlamaIndex_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    tags: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AzureChatOpenAI'
        this.name = 'azureChatOpenAI_LlamaIndex'
        this.version = 2.0
        this.type = 'AzureChatOpenAI'
        this.icon = 'Azure.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Azure OpenAI Chat LLM specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(OpenAI)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureOpenAIApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'gpt-3.5-turbo-16k'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'azureChatOpenAI_LlamaIndex')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as keyof typeof ALL_AZURE_OPENAI_CHAT_MODELS
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureOpenAIApiKey = getCredentialParam('azureOpenAIApiKey', credentialData, nodeData)
        const azureOpenAIApiInstanceName = getCredentialParam('azureOpenAIApiInstanceName', credentialData, nodeData)
        const azureOpenAIApiDeploymentName = getCredentialParam('azureOpenAIApiDeploymentName', credentialData, nodeData)
        const azureOpenAIApiVersion = getCredentialParam('azureOpenAIApiVersion', credentialData, nodeData)

        const obj: Partial<OpenAI> & { azure?: AzureOpenAIConfig } = {
            temperature: parseFloat(temperature),
            model: modelName,
            azure: {
                apiKey: azureOpenAIApiKey,
                endpoint: `https://${azureOpenAIApiInstanceName}.openai.azure.com`,
                apiVersion: azureOpenAIApiVersion,
                deploymentName: azureOpenAIApiDeploymentName
            }
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: AzureChatOpenAI_LlamaIndex_ChatModels }
