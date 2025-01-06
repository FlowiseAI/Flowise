import { IActiveCache, MODE } from './Interface'
import Redis from 'ioredis'

/**
 * This pool is to keep track of in-memory cache used for LLM and Embeddings
 */
export class CachePool {
    private redisClient: Redis | null = null
    activeLLMCache: IActiveCache = {}
    activeEmbeddingCache: IActiveCache = {}

    constructor() {
        if (process.env.MODE === MODE.QUEUE) {
            if (process.env.REDIS_URL) {
                this.redisClient = new Redis(process.env.REDIS_URL)
            } else {
                this.redisClient = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    username: process.env.REDIS_USERNAME || undefined,
                    password: process.env.REDIS_PASSWORD || undefined,
                    tls:
                        process.env.REDIS_TLS === 'true'
                            ? {
                                  cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                                  key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                                  ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                              }
                            : undefined
                })
            }
        }
    }

    /**
     * Add to the llm cache pool
     * @param {string} chatflowid
     * @param {Map<any, any>} value
     */
    async addLLMCache(chatflowid: string, value: Map<any, any>) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = JSON.stringify(Array.from(value.entries()))
                await this.redisClient.set(`llmCache:${chatflowid}`, serializedValue)
            }
        } else {
            this.activeLLMCache[chatflowid] = value
        }
    }

    /**
     * Add to the embedding cache pool
     * @param {string} chatflowid
     * @param {Map<any, any>} value
     */
    async addEmbeddingCache(chatflowid: string, value: Map<any, any>) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = JSON.stringify(Array.from(value.entries()))
                await this.redisClient.set(`embeddingCache:${chatflowid}`, serializedValue)
            }
        } else {
            this.activeEmbeddingCache[chatflowid] = value
        }
    }

    /**
     * Get item from llm cache pool
     * @param {string} chatflowid
     */
    async getLLMCache(chatflowid: string): Promise<Map<any, any> | undefined> {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = await this.redisClient.get(`llmCache:${chatflowid}`)
                if (serializedValue) {
                    return new Map(JSON.parse(serializedValue))
                }
            }
        } else {
            return this.activeLLMCache[chatflowid]
        }
        return undefined
    }

    /**
     * Get item from embedding cache pool
     * @param {string} chatflowid
     */
    async getEmbeddingCache(chatflowid: string): Promise<Map<any, any> | undefined> {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = await this.redisClient.get(`embeddingCache:${chatflowid}`)
                if (serializedValue) {
                    return new Map(JSON.parse(serializedValue))
                }
            }
        } else {
            return this.activeEmbeddingCache[chatflowid]
        }
        return undefined
    }

    /**
     * Close Redis connection if applicable
     */
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit()
        }
    }
}

let cachePoolInstance: CachePool | undefined

export function getInstance(): CachePool {
    if (cachePoolInstance === undefined) {
        cachePoolInstance = new CachePool()
    }

    return cachePoolInstance
}
