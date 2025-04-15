import type { CachedContentBase, CachedContent, Content } from '@google/generative-ai'
import { GoogleAICacheManager as GoogleAICacheManagerBase } from '@google/generative-ai/server'
import hash from 'object-hash'

type CacheContentOptions = Omit<CachedContentBase, 'contents'> & { contents?: Content[] }

export class GoogleAICacheManager extends GoogleAICacheManagerBase {
    private ttlSeconds: number
    private cachedContents: Map<string, CachedContent> = new Map()

    setTtlSeconds(ttlSeconds: number) {
        this.ttlSeconds = ttlSeconds
    }

    async lookup(options: CacheContentOptions): Promise<CachedContent | undefined> {
        const { model, tools, contents } = options
        if (!contents?.length) {
            return undefined
        }
        const hashKey = hash({
            model,
            tools,
            contents
        })
        if (this.cachedContents.has(hashKey)) {
            return this.cachedContents.get(hashKey)
        }
        const { cachedContents } = await this.list()
        const cachedContent = (cachedContents ?? []).find((cache) => cache.displayName === hashKey)
        if (cachedContent) {
            this.cachedContents.set(hashKey, cachedContent)
            return cachedContent
        }
        const res = await this.create({
            ...(options as CachedContentBase),
            displayName: hashKey,
            ttlSeconds: this.ttlSeconds
        })
        this.cachedContents.set(hashKey, res)
        return res
    }
}

export default GoogleAICacheManager
