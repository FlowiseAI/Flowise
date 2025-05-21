import { Redis } from 'ioredis'
import { RedisByteStore } from '@langchain/community/storage/ioredis'
import { Embeddings, EmbeddingsInterface } from '@langchain/core/embeddings'
import { CacheBackedEmbeddingsFields } from 'langchain/embeddings/cache_backed'
import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { BaseStore } from '@langchain/core/stores'
import { insecureHash } from '@langchain/core/utils/hash'
import { Document } from '@langchain/core/documents'

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

            client = new Redis({
                port: portStr ? parseInt(portStr) : 6379,
                host,
                username,
                password,
                keepAlive:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : undefined,
                ...tlsOptions
            })
        } else {
            client = new Redis(redisUrl, {
                keepAlive:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : undefined
            })
        }

        ttl ??= '3600'
        let ttlNumber = parseInt(ttl, 10)
        const redisStore = new RedisByteStore({
            client: client,
            ttl: ttlNumber
        })

        const store = CacheBackedEmbeddings.fromBytesStore(underlyingEmbeddings, redisStore, {
            namespace: namespace,
            redisClient: client
        })

        return store
    }
}

class CacheBackedEmbeddings extends Embeddings {
    protected underlyingEmbeddings: EmbeddingsInterface

    protected documentEmbeddingStore: BaseStore<string, number[]>

    protected redisClient?: Redis

    constructor(fields: CacheBackedEmbeddingsFields & { redisClient?: Redis }) {
        super(fields)
        this.underlyingEmbeddings = fields.underlyingEmbeddings
        this.documentEmbeddingStore = fields.documentEmbeddingStore
        this.redisClient = fields.redisClient
    }

    async embedQuery(document: string): Promise<number[]> {
        const res = this.underlyingEmbeddings.embedQuery(document)
        this.redisClient?.quit()
        return res
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        const vectors = await this.documentEmbeddingStore.mget(documents)
        const missingIndicies = []
        const missingDocuments = []
        for (let i = 0; i < vectors.length; i += 1) {
            if (vectors[i] === undefined) {
                missingIndicies.push(i)
                missingDocuments.push(documents[i])
            }
        }
        if (missingDocuments.length) {
            const missingVectors = await this.underlyingEmbeddings.embedDocuments(missingDocuments)
            const keyValuePairs: [string, number[]][] = missingDocuments.map((document, i) => [document, missingVectors[i]])
            await this.documentEmbeddingStore.mset(keyValuePairs)
            for (let i = 0; i < missingIndicies.length; i += 1) {
                vectors[missingIndicies[i]] = missingVectors[i]
            }
        }
        this.redisClient?.quit()
        return vectors as number[][]
    }

    static fromBytesStore(
        underlyingEmbeddings: EmbeddingsInterface,
        documentEmbeddingStore: BaseStore<string, Uint8Array>,
        options?: {
            namespace?: string
            redisClient?: Redis
        }
    ) {
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        const encoderBackedStore = new EncoderBackedStore<string, number[], Uint8Array>({
            store: documentEmbeddingStore,
            keyEncoder: (key) => (options?.namespace ?? '') + insecureHash(key),
            valueSerializer: (value) => encoder.encode(JSON.stringify(value)),
            valueDeserializer: (serializedValue) => JSON.parse(decoder.decode(serializedValue))
        })
        return new this({
            underlyingEmbeddings,
            documentEmbeddingStore: encoderBackedStore,
            redisClient: options?.redisClient
        })
    }
}

class EncoderBackedStore<K, V, SerializedType = any> extends BaseStore<K, V> {
    lc_namespace = ['langchain', 'storage']

    store: BaseStore<string, SerializedType>

    keyEncoder: (key: K) => string

    valueSerializer: (value: V) => SerializedType

    valueDeserializer: (value: SerializedType) => V

    constructor(fields: {
        store: BaseStore<string, SerializedType>
        keyEncoder: (key: K) => string
        valueSerializer: (value: V) => SerializedType
        valueDeserializer: (value: SerializedType) => V
    }) {
        super(fields)
        this.store = fields.store
        this.keyEncoder = fields.keyEncoder
        this.valueSerializer = fields.valueSerializer
        this.valueDeserializer = fields.valueDeserializer
    }

    async mget(keys: K[]): Promise<(V | undefined)[]> {
        const encodedKeys = keys.map(this.keyEncoder)
        const values = await this.store.mget(encodedKeys)
        return values.map((value) => {
            if (value === undefined) {
                return undefined
            }
            return this.valueDeserializer(value)
        })
    }

    async mset(keyValuePairs: [K, V][]): Promise<void> {
        const encodedPairs: [string, SerializedType][] = keyValuePairs.map(([key, value]) => [
            this.keyEncoder(key),
            this.valueSerializer(value)
        ])
        return this.store.mset(encodedPairs)
    }

    async mdelete(keys: K[]): Promise<void> {
        const encodedKeys = keys.map(this.keyEncoder)
        return this.store.mdelete(encodedKeys)
    }

    async *yieldKeys(prefix?: string | undefined): AsyncGenerator<string | K> {
        yield* this.store.yieldKeys(prefix)
    }
}

export function createDocumentStoreFromByteStore(store: BaseStore<string, Uint8Array>) {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    return new EncoderBackedStore({
        store,
        keyEncoder: (key: string) => key,
        valueSerializer: (doc: Document) => encoder.encode(JSON.stringify({ pageContent: doc.pageContent, metadata: doc.metadata })),
        valueDeserializer: (bytes: Uint8Array) => new Document(JSON.parse(decoder.decode(bytes)))
    })
}

module.exports = { nodeClass: RedisEmbeddingsCache }
