import { Redis } from 'ioredis'
import hash from 'object-hash'
import { RedisCache as LangchainRedisCache } from '@langchain/community/caches/ioredis'
import { StoredGeneration, mapStoredMessageToChatMessage } from '@langchain/core/messages'
import { Generation, ChatGeneration } from '@langchain/core/outputs'
import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'

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
            credentialNames: ['redisCacheApi', 'redisCacheUrlApi']
        }
        this.inputs = [
            {
                label: 'Time to Live (ms)',
                name: 'ttl',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const ttl = nodeData.inputs?.ttl as string

        let client = await getRedisClient(nodeData, options)
        const redisClient = new LangchainRedisCache(client)

        redisClient.lookup = async (prompt: string, llmKey: string) => {
            try {
                const pingResp = await client.ping()
                if (pingResp !== 'PONG') {
                    client = await getRedisClient(nodeData, options)
                }
            } catch (error) {
                client = await getRedisClient(nodeData, options)
            }

            let idx = 0
            let key = getCacheKey(prompt, llmKey, String(idx))
            let value = await client.get(key)
            const generations: Generation[] = []

            while (value) {
                const storedGeneration = JSON.parse(value)
                generations.push(deserializeStoredGeneration(storedGeneration))
                idx += 1
                key = getCacheKey(prompt, llmKey, String(idx))
                value = await client.get(key)
            }

            client.quit()

            return generations.length > 0 ? generations : null
        }

        redisClient.update = async (prompt: string, llmKey: string, value: Generation[]) => {
            try {
                const pingResp = await client.ping()
                if (pingResp !== 'PONG') {
                    client = await getRedisClient(nodeData, options)
                }
            } catch (error) {
                client = await getRedisClient(nodeData, options)
            }

            for (let i = 0; i < value.length; i += 1) {
                const key = getCacheKey(prompt, llmKey, String(i))
                if (ttl) {
                    await client.set(key, JSON.stringify(serializeGeneration(value[i])), 'PX', parseInt(ttl, 10))
                } else {
                    await client.set(key, JSON.stringify(serializeGeneration(value[i])))
                }
            }

            client.quit()
        }

        client.quit()

        return redisClient
    }
}
const getRedisClient = async (nodeData: INodeData, options: ICommonObject) => {
    let client: Redis

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)

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

    return client
}
const getCacheKey = (...strings: string[]): string => hash(strings.join('_'))
const deserializeStoredGeneration = (storedGeneration: StoredGeneration) => {
    if (storedGeneration.message !== undefined) {
        return {
            text: storedGeneration.text,
            message: mapStoredMessageToChatMessage(storedGeneration.message)
        }
    } else {
        return { text: storedGeneration.text }
    }
}
const serializeGeneration = (generation: Generation) => {
    const serializedValue: StoredGeneration = {
        text: generation.text
    }
    if ((generation as ChatGeneration).message !== undefined) {
        serializedValue.message = (generation as ChatGeneration).message.toDict()
    }
    return serializedValue
}

module.exports = { nodeClass: RedisCache }
