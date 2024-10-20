import { BaseCache } from '@langchain/core/caches'
import { ChatBaiduWenxin } from '@langchain/community/chat_models/baiduwenxin'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
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
        this.label = 'ChatBaiduWenxin'
        this.name = 'chatBaiduWenxin'
        this.version = 1.0
        this.type = 'ChatBaiduWenxin'
        this.icon = 'baiduwenxin.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around BaiduWenxin Chat Endpoints'
        this.baseClasses = [this.type, ...getBaseClasses(ChatBaiduWenxin)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['baiduApi']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model',
                name: 'modelName',
                type: 'string',
                placeholder: 'ERNIE-Bot-turbo'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const baiduApiKey = getCredentialParam('baiduApiKey', credentialData, nodeData)
        const baiduSecretKey = getCredentialParam('baiduSecretKey', credentialData, nodeData)

        const obj: Partial<ChatBaiduWenxin> = {
            streaming: true,
            baiduApiKey,
            baiduSecretKey,
            modelName,
            temperature: temperature ? parseFloat(temperature) : undefined
        }
        if (cache) obj.cache = cache

        const model = new ChatBaiduWenxin(obj)
        return model
    }
}

module.exports = { nodeClass: ChatBaiduWenxin_ChatModels }
