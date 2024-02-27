import { BaseCache } from '@langchain/core/caches'
import hash from 'object-hash'
import { getBaseClasses, ICommonObject, INode, INodeData, INodeParams } from '../../../src'

class InMemoryCache implements INode {
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
        this.label = 'InMemory Cache'
        this.name = 'inMemoryCache'
        this.version = 1.0
        this.type = 'InMemoryCache'
        this.description = 'Cache LLM response in memory, will be cleared once app restarted'
        this.icon = 'Memory.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(InMemoryCacheExtended)]
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const memoryMap = options.cachePool.getLLMCache(options.chatflowid) ?? new Map()
        const inMemCache = new InMemoryCacheExtended(memoryMap)

        inMemCache.lookup = async (prompt: string, llmKey: string): Promise<any | null> => {
            const memory = options.cachePool.getLLMCache(options.chatflowid) ?? inMemCache.cache
            return Promise.resolve(memory.get(getCacheKey(prompt, llmKey)) ?? null)
        }

        inMemCache.update = async (prompt: string, llmKey: string, value: any): Promise<void> => {
            inMemCache.cache.set(getCacheKey(prompt, llmKey), value)
            options.cachePool.addLLMCache(options.chatflowid, inMemCache.cache)
        }
        return inMemCache
    }
}

const getCacheKey = (...strings: string[]): string => hash(strings.join('_'))

class InMemoryCacheExtended extends BaseCache {
    cache: Map<string, any>

    constructor(map: Map<string, any>) {
        super()
        this.cache = map
    }

    lookup(prompt: string, llmKey: string): Promise<any | null> {
        return Promise.resolve(this.cache.get(getCacheKey(prompt, llmKey)) ?? null)
    }

    async update(prompt: string, llmKey: string, value: any): Promise<void> {
        this.cache.set(getCacheKey(prompt, llmKey), value)
    }
}

module.exports = { nodeClass: InMemoryCache }
