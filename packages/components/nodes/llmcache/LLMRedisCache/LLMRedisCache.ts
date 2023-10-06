import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
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
    credential: INodeParams

    constructor() {
        this.label = 'Redis LLM Cache'
        this.name = 'redisCache'
        this.version = 1.0
        this.type = 'LLMCache'
        this.icon = 'redis.svg'
        this.category = 'LLM Cache'
        this.baseClasses = [this.type, ...getBaseClasses(RedisCache)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['redisCacheApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
        const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
        const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
        const host = getCredentialParam('redisCacheHost', credentialData, nodeData)

        const client = new Redis({
            port: portStr ? parseInt(portStr) : 6379,
            host,
            username,
            password
        })
        return new RedisCache(client)
    }
}

module.exports = { nodeClass: LLMRedisCache }
