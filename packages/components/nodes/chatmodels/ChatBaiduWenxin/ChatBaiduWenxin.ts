import { BaseCache } from '@langchain/core/caches'
import { ChatBaiduQianfan } from '@langchain/baidu-qianfan'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatBaiduWenxin_ChatModels implements INode {
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
        this.label = 'Baidu Wenxin'
        this.name = 'chatBaiduWenxin'
        this.version = 3.0
        this.type = 'ChatBaiduWenxin'
        this.icon = 'baiduwenxin.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around BaiduWenxin Chat Endpoints'
        this.baseClasses = [this.type, ...getBaseClasses(ChatBaiduQianfan)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['baiduQianfanApi']
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
                default: 'ernie-4.5-8k-preview'
            },
            {
                label: 'Custom Model Name',
                name: 'customModelName',
                type: 'string',
                placeholder: 'ernie-speed-128k',
                description: 'Custom model name to use. If provided, it will override the selected model.',
                additionalParams: true,
                optional: true
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
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                description: 'Nucleus sampling. The model considers tokens whose cumulative probability mass reaches this value.',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Penalty Score',
                name: 'penaltyScore',
                type: 'number',
                description: 'Penalizes repeated tokens according to frequency. Baidu Qianfan accepts values from 1.0 to 2.0.',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'User ID',
                name: 'userId',
                type: 'string',
                description: 'Optional unique identifier for the end user making the request.',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatBaiduWenxin')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const streaming = nodeData.inputs?.streaming as boolean
        const topP = nodeData.inputs?.topP as string
        const penaltyScore = nodeData.inputs?.penaltyScore as string
        const userId = nodeData.inputs?.userId as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const qianfanAccessKey = getCredentialParam('qianfanAccessKey', credentialData, nodeData)
        const qianfanSecretKey = getCredentialParam('qianfanSecretKey', credentialData, nodeData)

        const obj: Partial<ChatBaiduQianfan> = {
            streaming: streaming ?? true,
            qianfanAccessKey,
            qianfanSecretKey,
            modelName: customModelName || modelName,
            temperature: temperature ? parseFloat(temperature) : undefined
        }
        if (topP) obj.topP = parseFloat(topP)
        if (penaltyScore) obj.penaltyScore = parseFloat(penaltyScore)
        if (userId) obj.userId = userId
        if (cache) obj.cache = cache

        const model = new ChatBaiduQianfan(obj)
        return model
    }
}

module.exports = { nodeClass: ChatBaiduWenxin_ChatModels }
