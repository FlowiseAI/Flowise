import WebClient from './client'
import redisLoader from '../redisLoader'

export const webClient = new WebClient()

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24 // 1 day

const getWebPageHtml = async ({ url }: { url: string }): Promise<string> => {
    console.log(`===Fetching webpage: ${url}`)
    try {
        const pageHtml = await webClient.fetchWebData(url, { cache: !IS_DEVELOPMENT })

        if (!pageHtml) {
            throw new Error(`No valid HTML returned for url: ${url}`)
        }

        return pageHtml
    } catch (error: any) {
        console.error('[getWebPageHtml] ', error)
        // throw error;
        return ''
    }
}

export const webPageLoader = redisLoader<string, string>({
    keyPrefix: 'web:page:v1',
    redisConfig: process.env.REDIS_URL as string,
    getValuesFn: async (keys) => {
        const results: Array<string> = []
        for (const url of keys) {
            const result = await getWebPageHtml({ url })
            results.push(result)
        }

        const allResults = await Promise.all(results)
        return allResults
    },
    cacheExpirationInSeconds: CACHE_EXPIRATION,
    disableCache: IS_DEVELOPMENT
})
