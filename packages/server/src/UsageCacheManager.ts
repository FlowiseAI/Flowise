import { Keyv } from 'keyv'
import KeyvRedis from '@keyv/redis'
import { Cache, createCache } from 'cache-manager'
import { MODE } from './Interface'
import { LICENSE_QUOTAS } from './utils/constants'
import { StripeManager } from './StripeManager'

const DISABLED_QUOTAS = {
    [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 0,
    [LICENSE_QUOTAS.STORAGE_LIMIT]: 0, // in MB
    [LICENSE_QUOTAS.FLOWS_LIMIT]: 0,
    [LICENSE_QUOTAS.USERS_LIMIT]: 0,
    [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: 0
}

const UNLIMITED_QUOTAS = {
    [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: -1,
    [LICENSE_QUOTAS.STORAGE_LIMIT]: -1,
    [LICENSE_QUOTAS.FLOWS_LIMIT]: -1,
    [LICENSE_QUOTAS.USERS_LIMIT]: -1,
    [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: -1
}

export class UsageCacheManager {
    private cache: Cache
    private static instance: UsageCacheManager

    public static async getInstance(): Promise<UsageCacheManager> {
        if (!UsageCacheManager.instance) {
            UsageCacheManager.instance = new UsageCacheManager()
            await UsageCacheManager.instance.initialize()
        }
        return UsageCacheManager.instance
    }

    private async initialize(): Promise<void> {
        if (process.env.MODE === MODE.QUEUE) {
            let redisConfig: string | Record<string, any>
            if (process.env.REDIS_URL) {
                redisConfig = {
                    url: process.env.REDIS_URL,
                    socket: {
                        keepAlive:
                            process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                                ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                                : undefined
                    },
                    pingInterval:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                }
            } else {
                redisConfig = {
                    username: process.env.REDIS_USERNAME || undefined,
                    password: process.env.REDIS_PASSWORD || undefined,
                    socket: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT || '6379'),
                        tls: process.env.REDIS_TLS === 'true',
                        cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                        key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                        ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined,
                        keepAlive:
                            process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                                ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                                : undefined
                    },
                    pingInterval:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                }
            }
            this.cache = createCache({
                stores: [
                    new Keyv({
                        store: new KeyvRedis(redisConfig)
                    })
                ]
            })
        } else {
            this.cache = createCache()
        }
    }

    public async getSubscriptionDetails(subscriptionId: string, withoutCache: boolean = false): Promise<Record<string, any>> {
        const stripeManager = await StripeManager.getInstance()
        if (!stripeManager || !subscriptionId) {
            return UNLIMITED_QUOTAS
        }

        // Skip cache if withoutCache is true
        if (!withoutCache) {
            const subscriptionData = await this.getSubscriptionDataFromCache(subscriptionId)
            if (subscriptionData?.subsriptionDetails) {
                return subscriptionData.subsriptionDetails
            }
        }

        // If not in cache, retrieve from Stripe
        const subscription = await stripeManager.getStripe().subscriptions.retrieve(subscriptionId)

        // Update subscription data cache
        await this.updateSubscriptionDataToCache(subscriptionId, { subsriptionDetails: stripeManager.getSubscriptionObject(subscription) })

        return stripeManager.getSubscriptionObject(subscription)
    }

    public async getQuotas(subscriptionId: string, withoutCache: boolean = false): Promise<Record<string, number>> {
        const stripeManager = await StripeManager.getInstance()
        if (!stripeManager || !subscriptionId) {
            return UNLIMITED_QUOTAS
        }

        // Skip cache if withoutCache is true
        if (!withoutCache) {
            const subscriptionData = await this.getSubscriptionDataFromCache(subscriptionId)
            if (subscriptionData?.quotas) {
                return subscriptionData.quotas
            }
        }

        // If not in cache, retrieve from Stripe
        const subscription = await stripeManager.getStripe().subscriptions.retrieve(subscriptionId)
        const items = subscription.items.data
        if (items.length === 0) {
            return DISABLED_QUOTAS
        }

        const productId = items[0].price.product as string
        const product = await stripeManager.getStripe().products.retrieve(productId)
        const productMetadata = product.metadata

        if (!productMetadata || Object.keys(productMetadata).length === 0) {
            return DISABLED_QUOTAS
        }

        const quotas: Record<string, number> = {}
        for (const key in productMetadata) {
            if (key.startsWith('quota:')) {
                quotas[key] = parseInt(productMetadata[key])
            }
        }

        const additionalSeatsItem = subscription.items.data.find(
            (item) => (item.price.product as string) === process.env.ADDITIONAL_SEAT_ID
        )
        quotas[LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT] = additionalSeatsItem?.quantity || 0

        // Update subscription data cache with quotas
        await this.updateSubscriptionDataToCache(subscriptionId, {
            quotas,
            subsriptionDetails: stripeManager.getSubscriptionObject(subscription)
        })

        return quotas
    }

    public async getSubscriptionDataFromCache(subscriptionId: string) {
        const cacheKey = `subscription:${subscriptionId}`
        return await this.get<{
            quotas?: Record<string, number>
            productId?: string
            features?: Record<string, string>
            subsriptionDetails?: Record<string, any>
        }>(cacheKey)
    }

    public async updateSubscriptionDataToCache(
        subscriptionId: string,
        data: Partial<{
            quotas: Record<string, number>
            productId: string
            features: Record<string, string>
            subsriptionDetails: Record<string, any>
        }>
    ) {
        const cacheKey = `subscription:${subscriptionId}`
        const existingData = (await this.getSubscriptionDataFromCache(subscriptionId)) || {}
        const updatedData = { ...existingData, ...data }
        this.set(cacheKey, updatedData, 3600000) // Cache for 1 hour
    }

    public async get<T>(key: string): Promise<T | null> {
        if (!this.cache) await this.initialize()
        const value = await this.cache.get<T>(key)
        return value
    }

    public async getTTL(key: string): Promise<number | null> {
        if (!this.cache) await this.initialize()
        const value = await this.cache.ttl(key)
        return value
    }

    public async mget<T>(keys: string[]): Promise<(T | null)[]> {
        if (this.cache) {
            const values = await this.cache.mget<T>(keys)
            return values
        } else {
            return []
        }
    }

    public set<T>(key: string, value: T, ttl?: number) {
        if (this.cache) {
            this.cache.set(key, value, ttl)
        }
    }

    public mset<T>(keys: [{ key: string; value: T; ttl: number }]) {
        if (this.cache) {
            this.cache.mset(keys)
        }
    }

    public async del(key: string): Promise<void> {
        await this.cache.del(key)
    }

    public async mdel(keys: string[]): Promise<void> {
        await this.cache.mdel(keys)
    }

    public async clear(): Promise<void> {
        await this.cache.clear()
    }

    public async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
        return this.cache.wrap(key, fn, ttl)
    }
}
