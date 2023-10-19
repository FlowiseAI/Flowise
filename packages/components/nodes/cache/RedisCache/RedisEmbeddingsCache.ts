import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { Redis } from 'ioredis'
import { CacheBackedEmbeddings } from 'langchain/embeddings/cache_backed'
import { RedisByteStore } from 'langchain/storage/ioredis'
import { Embeddings } from 'langchain/embeddings/base'

class RedisEmbeddingsCache implements INode {
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
        this.label = 'Redis Embeddings Cache'
        this.name = 'redisEmbeddingsCache'
        this.version = 1.0
        this.type = 'RedisEmbeddingsCache'
        this.description = 'Cache generated Embeddings in Redis to avoid needing to recompute them.'
        this.icon = 'redis.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(CacheBackedEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['redisCacheApi']
        }
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Time to Live (ms)',
                name: 'ttl',
                type: 'number',
                step: 10,
                default: 60 * 60,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Namespace',
                name: 'namespace',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let ttl = nodeData.inputs?.ttl as string
        const namespace = nodeData.inputs?.namespace as string
        const underlyingEmbeddings = nodeData.inputs?.embeddings as Embeddings

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
        ttl ??= '3600'
        let ttlNumber = parseInt(ttl, 10)
        const redisStore = new RedisByteStore({
            client: client,
            ttl: ttlNumber
        })

        return CacheBackedEmbeddings.fromBytesStore(underlyingEmbeddings, redisStore, {
            namespace: namespace
        })
    }
}

module.exports = { nodeClass: RedisEmbeddingsCache }
