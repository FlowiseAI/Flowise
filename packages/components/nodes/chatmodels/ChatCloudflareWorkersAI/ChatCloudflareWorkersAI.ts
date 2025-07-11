import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields } from '@langchain/openai'

const serverCredentialsExists = !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_API_KEY

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
        this.version = 1.1
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
            optional: serverCredentialsExists,
            description: 'Cloudflare Workers AI credential.'
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: '@cf/meta/llama-4-scout-17b-16e-instruct'
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
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
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
        const apiKey = process.env.CLOUDFLARE_API_KEY ?? getCredentialParam('cloudflareWorkersAIKey', credentialData, nodeData)
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? getCredentialParam('cloudflareWorkersAccountID', credentialData, nodeData)
        const modelName = nodeData.inputs?.modelName as string
        const streaming = nodeData.inputs?.streaming as boolean
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            model: modelName,
            streaming: streaming ?? true,
            apiKey,
            configuration: { baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1` }
        }
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)

        return new LangchainChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatCloudflareWorkersAI_ChatModels }
