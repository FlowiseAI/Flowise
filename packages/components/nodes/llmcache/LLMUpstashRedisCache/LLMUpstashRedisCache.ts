import {
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    ICommonObject,
    INode,
    INodeData,
    INodeOutputsValue,
    INodeParams
} from '../../../src'
import { UpstashRedisCache } from 'langchain/cache/upstash_redis'

class LLMUpstashRedisCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    credential: INodeParams

    constructor() {
        this.label = 'Upstash Redis LLM Cache'
        this.name = 'upstashRedisCache'
        this.version = 1.0
        this.type = 'LLMCache'
        this.icon = 'upstash.png'
        this.category = 'LLM Cache'
        this.baseClasses = [this.type, 'LLMCacheBase']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['upstashRedisApi']
        }
        this.inputs = []
        this.outputs = [
            {
                label: 'LLM Cache',
                name: 'cache',
                baseClasses: [this.type, ...getBaseClasses(UpstashRedisCache)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const upstashConnectionUrl = getCredentialParam('upstashConnectionUrl', credentialData, nodeData)
        const upstashToken = getCredentialParam('upstashConnectionToken', credentialData, nodeData)

        const cache = new UpstashRedisCache({
            config: {
                url: upstashConnectionUrl,
                token: upstashToken
            }
        })
        return cache
    }
}

module.exports = { nodeClass: LLMUpstashRedisCache }
