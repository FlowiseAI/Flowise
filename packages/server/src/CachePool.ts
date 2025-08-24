import { IActiveCache, MODE } from './Interface'
import Redis from 'ioredis'

/**
 * This pool is to keep track of in-memory cache used for LLM and Embeddings
 */
export class CachePool {
    private redisClient: Redis | null = null
    activeLLMCache: IActiveCache = {}
    activeEmbeddingCache: IActiveCache = {}
    activeMCPCache: { [key: string]: any } = {}
    ssoTokenCache: { [key: string]: any } = {}

    constructor() {
        if (process.env.MODE === MODE.QUEUE) {
            if (process.env.REDIS_URL) {
                this.redisClient = new Redis(process.env.REDIS_URL, {
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
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
                            : undefined,
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            }
        }
    }

    /**
     * Add to the sso token cache pool
     * @param {string} ssoToken
     * @param {any} value
     */
    async addSSOTokenCache(ssoToken: string, value: any) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = JSON.stringify(value)
                await this.redisClient.set(`ssoTokenCache:${ssoToken}`, serializedValue, 'EX', 120)
            }
        } else {
            this.ssoTokenCache[ssoToken] = value
        }
    }

    async getSSOTokenCache(ssoToken: string): Promise<any | undefined> {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = await this.redisClient.get(`ssoTokenCache:${ssoToken}`)
                if (serializedValue) {
                    return JSON.parse(serializedValue)
                }
            }
        } else {
            return this.ssoTokenCache[ssoToken]
        }
        return undefined
    }

    async deleteSSOTokenCache(ssoToken: string) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                await this.redisClient.del(`ssoTokenCache:${ssoToken}`)
            }
        } else {
            delete this.ssoTokenCache[ssoToken]
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
     * Add to the mcp toolkit cache pool
     * @param {string} cacheKey
     * @param {any} value
     */
    async addMCPCache(cacheKey: string, value: any) {
        // Only add to cache for non-queue mode, because we are storing the toolkit instances in memory, and we can't store them in redis
        if (process.env.MODE !== MODE.QUEUE) {
            this.activeMCPCache[`mcpCache:${cacheKey}`] = value
        }
    }

    /**
     * Get item from mcp toolkit cache pool
     * @param {string} cacheKey
     */
    async getMCPCache(cacheKey: string): Promise<any | undefined> {
        if (process.env.MODE !== MODE.QUEUE) {
            return this.activeMCPCache[`mcpCache:${cacheKey}`]
        }
        return undefined
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
