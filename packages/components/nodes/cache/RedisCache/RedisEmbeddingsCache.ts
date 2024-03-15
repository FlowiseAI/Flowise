import { Redis, RedisOptions } from 'ioredis'
import { isEqual } from 'lodash'
import { RedisByteStore } from '@langchain/community/storage/ioredis'
import { Embeddings } from '@langchain/core/embeddings'
import { CacheBackedEmbeddings } from 'langchain/embeddings/cache_backed'
import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'

let redisClientSingleton: Redis
let redisClientOption: RedisOptions
let redisClientUrl: string

const getRedisClientbyOption = (option: RedisOptions) => {
    if (!redisClientSingleton) {
        // if client doesn't exists
        redisClientSingleton = new Redis(option)
        redisClientOption = option
        return redisClientSingleton
    } else if (redisClientSingleton && !isEqual(option, redisClientOption)) {
        // if client exists but option changed
        redisClientSingleton.quit()
        redisClientSingleton = new Redis(option)
        redisClientOption = option
        return redisClientSingleton
    }
    return redisClientSingleton
}

const getRedisClientbyUrl = (url: string) => {
    if (!redisClientSingleton) {
        // if client doesn't exists
        redisClientSingleton = new Redis(url)
        redisClientUrl = url
        return redisClientSingleton
    } else if (redisClientSingleton && url !== redisClientUrl) {
        // if client exists but option changed
        redisClientSingleton.quit()
        redisClientSingleton = new Redis(url)
        redisClientUrl = url
        return redisClientSingleton
    }
    return redisClientSingleton
}

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
            credentialNames: ['redisCacheApi', 'redisCacheUrlApi']
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
        const redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)

        let client: Redis
        if (!redisUrl || redisUrl === '') {
            const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
            const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
            const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
            const host = getCredentialParam('redisCacheHost', credentialData, nodeData)
            const sslEnabled = getCredentialParam('redisCacheSslEnabled', credentialData, nodeData)

            const tlsOptions = sslEnabled === true ? { tls: { rejectUnauthorized: false } } : {}

            client = getRedisClientbyOption({
                port: portStr ? parseInt(portStr) : 6379,
                host,
                username,
                password,
                ...tlsOptions
            })
        } else {
            client = getRedisClientbyUrl(redisUrl)
        }

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
