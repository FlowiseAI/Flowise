import { IActiveCache } from './Interface'

/**
 * This pool is to keep track of in-memory cache used for LLM and Embeddings
 */
export class CachePool {
    activeLLMCache: IActiveCache = {}
    activeEmbeddingCache: IActiveCache = {}

    /**
     * Add to the llm cache pool
     * @param {string} chatflowid
     * @param {Map<any, any>} value
     */
    addLLMCache(chatflowid: string, value: Map<any, any>) {
        this.activeLLMCache[chatflowid] = value
    }

    /**
     * Add to the embedding cache pool
     * @param {string} chatflowid
     * @param {Map<any, any>} value
     */
    addEmbeddingCache(chatflowid: string, value: Map<any, any>) {
        this.activeEmbeddingCache[chatflowid] = value
    }

    /**
     * Get item from llm cache pool
     * @param {string} chatflowid
     */
    getLLMCache(chatflowid: string): Map<any, any> | undefined {
        return this.activeLLMCache[chatflowid]
    }

    /**
     * Get item from embedding cache pool
     * @param {string} chatflowid
     */
    getEmbeddingCache(chatflowid: string): Map<any, any> | undefined {
        return this.activeEmbeddingCache[chatflowid]
    }
}

let cachePoolInstance: CachePool | undefined

export function getInstance(): CachePool {
    if (cachePoolInstance === undefined) {
        cachePoolInstance = new CachePool()
    }

    return cachePoolInstance
}
