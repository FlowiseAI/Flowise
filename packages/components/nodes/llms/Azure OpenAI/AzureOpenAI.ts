import { AzureOpenAIInput, OpenAI, OpenAIInput } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

const serverCredentialsExists =
    !!process.env.AZURE_OPENAI_API_KEY &&
    !!process.env.AZURE_OPENAI_API_INSTANCE_NAME &&
    !!process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME &&
    !!process.env.AZURE_OPENAI_API_VERSION

class AzureOpenAI_LLMs implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure OpenAI'
        this.name = 'azureOpenAI'
        this.version = 4.0
        this.type = 'AzureOpenAI'
        this.icon = 'Azure.svg'
        this.category = 'LLMs'
        this.description = 'Wrapper around Azure OpenAI large language models'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureOpenAIApi'],
            optional: serverCredentialsExists
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'text-davinci-003'
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
                label: 'Best Of',
                name: 'bestOf',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
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
            },
            {
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'azureOpenAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const bestOf = nodeData.inputs?.bestOf as string
        const streaming = nodeData.inputs?.streaming as boolean
        const basePath = nodeData.inputs?.basepath as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureOpenAIApiKey = getCredentialParam('azureOpenAIApiKey', credentialData, nodeData)
        const azureOpenAIApiInstanceName = getCredentialParam('azureOpenAIApiInstanceName', credentialData, nodeData)
        const azureOpenAIApiDeploymentName = getCredentialParam('azureOpenAIApiDeploymentName', credentialData, nodeData)
        const azureOpenAIApiVersion = getCredentialParam('azureOpenAIApiVersion', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<AzureOpenAIInput> & BaseLLMParams & Partial<OpenAIInput> = {
            temperature: parseFloat(temperature),
            modelName,
            azureOpenAIApiKey,
            azureOpenAIApiInstanceName,
            azureOpenAIApiDeploymentName,
            azureOpenAIApiVersion,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (bestOf) obj.bestOf = parseInt(bestOf, 10)
        if (cache) obj.cache = cache
        if (basePath) obj.azureOpenAIBasePath = basePath

        const model = new OpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: AzureOpenAI_LLMs }
