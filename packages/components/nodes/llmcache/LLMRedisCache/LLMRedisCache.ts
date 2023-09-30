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
import { RedisCache } from 'langchain/cache/ioredis'
import { Redis } from 'ioredis'

class LLMRedisCache implements INode {
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
        this.label = 'Redis LLM Cache'
        this.name = 'redisCache'
        this.version = 1.0
        this.type = 'LLMCache'
        this.icon = 'redis.svg'
        this.category = 'LLM Cache'
        this.baseClasses = [this.type, 'LLMCacheBase']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['redisCacheApi']
        }
        this.inputs = []
        this.outputs = [
            {
                label: 'LLM Cache',
                name: 'cache',
                baseClasses: [this.type, ...getBaseClasses(RedisCache)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
        const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
        const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
        const host = getCredentialParam('redisCacheHost', credentialData, nodeData)
        let port = 6379
        try {
            port = portStr ? parseInt(portStr) : 6379
        } catch (e) {
            port = 6379
        }

        const client = new Redis({
            port: port, // Redis port
            host: host,
            username: username,
            password: password
        })
        return new RedisCache(client)
    }
}

module.exports = { nodeClass: LLMRedisCache }
