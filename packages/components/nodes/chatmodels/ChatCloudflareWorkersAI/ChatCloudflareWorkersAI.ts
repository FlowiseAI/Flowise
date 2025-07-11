import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields } from '@langchain/openai'

class ChatCloudflareWorkersAI_ChatModels implements INode {
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
        this.label = 'ChatCloudflareWorkersAI'
        this.name = 'chatCloudflareWorkersAI'
        this.version = 1.0
        this.type = 'ChatCloudflareWorkersAI'
        this.icon = 'cloudflare.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Cloudflare large language models that use the OpenAI compatible Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cloudflareWorkersAI'],
            optional: false,
            description: 'Cloudflare Workers AI credential.'
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: '@cf/google/gemma-3-12b-it'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
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
            return await getModels(MODEL_TYPE.CHAT, 'chatCloudflareWorkersAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cloudflareWorkersAIKey', credentialData, nodeData)
        const accountId = getCredentialParam('cloudflareWorkersAccountID', credentialData, nodeData)
        const modelName = nodeData.inputs?.modelName as string
        const streaming = nodeData.inputs?.streaming as boolean
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            model: modelName,
            streaming: streaming,
            apiKey,
            configuration: { baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1` }
        }
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)

        return new LangchainChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatCloudflareWorkersAI_ChatModels }
