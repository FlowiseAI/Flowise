import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { RedisCache as LangchainRedisCache } from 'langchain/cache/ioredis'
import { Redis } from 'ioredis'

class RedisCache implements INode {
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
        this.label = 'Redis Cache'
        this.name = 'redisCache'
        this.version = 1.0
        this.type = 'RedisCache'
        this.description = 'Cache LLM response in Redis, useful for sharing cache across multiple processes or servers'
        this.icon = 'redis.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainRedisCache)]
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
        return new LangchainRedisCache(client)
    }
}

module.exports = { nodeClass: RedisCache }
