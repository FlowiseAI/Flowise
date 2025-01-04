import { Embeddings } from '@langchain/core/embeddings'
import { BaseStore } from '@langchain/core/stores'
import { CacheBackedEmbeddings } from 'langchain/embeddings/cache_backed'
import { getBaseClasses, ICommonObject, INode, INodeData, INodeParams } from '../../../src'

class InMemoryEmbeddingCache implements INode {
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
        this.label = 'InMemory Embedding Cache'
        this.name = 'inMemoryEmbeddingCache'
        this.version = 1.0
        this.type = 'InMemoryEmbeddingCache'
        this.description = 'Cache generated Embeddings in memory to avoid needing to recompute them.'
        this.icon = 'Memory.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(CacheBackedEmbeddings)]
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
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
        const namespace = nodeData.inputs?.namespace as string
        const underlyingEmbeddings = nodeData.inputs?.embeddings as Embeddings
        const memoryMap = (await options.cachePool.getEmbeddingCache(options.chatflowid)) ?? {}
        const inMemCache = new InMemoryEmbeddingCacheExtended(memoryMap)

        inMemCache.mget = async (keys: string[]) => {
            const memory = (await options.cachePool.getEmbeddingCache(options.chatflowid)) ?? inMemCache.store
            return keys.map((key) => memory[key])
        }

        inMemCache.mset = async (keyValuePairs: [string, any][]): Promise<void> => {
            for (const [key, value] of keyValuePairs) {
                inMemCache.store[key] = value
            }
            await options.cachePool.addEmbeddingCache(options.chatflowid, inMemCache.store)
        }

        inMemCache.mdelete = async (keys: string[]): Promise<void> => {
            for (const key of keys) {
                delete inMemCache.store[key]
            }
            await options.cachePool.addEmbeddingCache(options.chatflowid, inMemCache.store)
        }

        return CacheBackedEmbeddings.fromBytesStore(underlyingEmbeddings, inMemCache, {
            namespace: namespace
        })
    }
}

class InMemoryEmbeddingCacheExtended<T = any> extends BaseStore<string, T> {
    lc_namespace = ['langchain', 'storage', 'in_memory']

    store: Record<string, T> = {}

    constructor(map: Record<string, T>) {
        super()
        this.store = map
    }

    /**
     * Retrieves the values associated with the given keys from the store.
     * @param keys Keys to retrieve values for.
     * @returns Array of values associated with the given keys.
     */
    async mget(keys: string[]) {
        return keys.map((key) => this.store[key])
    }

    /**
     * Sets the values for the given keys in the store.
     * @param keyValuePairs Array of key-value pairs to set in the store.
     * @returns Promise that resolves when all key-value pairs have been set.
     */
    async mset(keyValuePairs: [string, T][]): Promise<void> {
        for (const [key, value] of keyValuePairs) {
            this.store[key] = value
        }
    }

    /**
     * Deletes the given keys and their associated values from the store.
     * @param keys Keys to delete from the store.
     * @returns Promise that resolves when all keys have been deleted.
     */
    async mdelete(keys: string[]): Promise<void> {
        for (const key of keys) {
            delete this.store[key]
        }
    }

    /**
     * Asynchronous generator that yields keys from the store. If a prefix is
     * provided, it only yields keys that start with the prefix.
     * @param prefix Optional prefix to filter keys.
     * @returns AsyncGenerator that yields keys from the store.
     */
    async *yieldKeys(prefix?: string | undefined): AsyncGenerator<string> {
        const keys = Object.keys(this.store)
        for (const key of keys) {
            if (prefix === undefined || key.startsWith(prefix)) {
                yield key
            }
        }
    }
}

module.exports = { nodeClass: InMemoryEmbeddingCache }
