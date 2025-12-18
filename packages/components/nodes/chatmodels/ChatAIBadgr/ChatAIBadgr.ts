import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatAIBadgr_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'ChatAIBadgr'
        this.name = 'chatAIBadgr'
        this.version = 1.0
        this.type = 'ChatAIBadgr'
        this.icon = 'aibadgr.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around AI Badgr large language models'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['aiBadgrApi']
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
                type: 'string',
                placeholder: 'gpt-4o',
                description: 'Refer to <a target="_blank" href="https://aibadgr.com/api/v1/models">models</a> page'
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
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const aiBadgrApiKey = getCredentialParam('aiBadgrApiKey', credentialData, nodeData)

        const obj: any = {
            model: modelName,
            temperature: parseFloat(temperature),
            openAIApiKey: aiBadgrApiKey,
            streaming: streaming ?? true,
            configuration: {
                baseURL: 'https://aibadgr.com/api/v1'
            }
        }
        if (cache) obj.cache = cache

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatAIBadgr_ChatModels }
